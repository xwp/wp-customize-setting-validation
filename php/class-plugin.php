<?php
/**
 * Bootstraps the Customize Setting Validation plugin.
 *
 * @package CustomizeSettingValidation
 */

namespace CustomizeSettingValidation;

/**
 * Main plugin bootstrap file.
 */
class Plugin extends Plugin_Base {

	/**
	 * Invalid settings.
	 *
	 * @var array Mapping of setting IDs to invalid messages.
	 */
	public $invalid_settings = array();

	/**
	 * Sanitized values of saved settings.
	 *
	 * @var array
	 */
	public $saved_setting_values = array();

	/**
	 * Class constructor.
	 */
	public function __construct() {
		parent::__construct();

		add_action( 'after_setup_theme', array( $this, 'init' ) );
	}

	/**
	 * Initiate the plugin resources.
	 *
	 * @action after_setup_theme
	 */
	public function init() {
		add_action( 'customize_controls_enqueue_scripts', array( $this, 'customize_controls_enqueue_scripts' ), 11 );

		$priority = 1;
		add_action( 'customize_save', array( $this, 'do_customize_validate_settings' ), $priority );

		add_filter( 'customize_save_response', array( $this, 'filter_customize_save_response' ) );

		// Priority is set to 100 so that plugins can attach validation-sanitization filters at default priority of 10.
		add_action( 'customize_validate_settings', array( $this, 'validate_settings' ), 100 );

		// Priority set to 1000 in case a plugin dynamically adds a setting just in time.
		add_action( 'customize_save', array( $this, '_add_actions_for_flagging_saved_settings' ), 1000 );

		add_action( 'customize_save_after', array( $this, 'gather_saved_setting_values' ) );

		add_action( 'customize_controls_print_footer_scripts', array( $this, 'print_templates' ), 1 );
	}

	/**
	 * Enqueue scripts.
	 *
	 * @action customize_controls_enqueue_scripts
	 */
	public function customize_controls_enqueue_scripts() {
		$ver = false;

		$handle = 'customize-setting-validation';
		$src = $this->dir_url . 'js/customize-setting-validation.js';
		$deps = array( 'customize-controls' );
		$in_footer = true;
		wp_enqueue_script( $handle, $src, $deps, $ver, $in_footer );

		$handle = 'customize-setting-validation';
		$src = $this->dir_url . 'css/customize-setting-validation.css';
		$deps = array( 'customize-controls' );
		wp_enqueue_style( $handle, $src, $deps, $ver );
	}

	/**
	 * Trigger the 'customize_validate_settings' action.
	 *
	 * This is done so that plugins can check the return value of
	 * <code>doing_action( 'customize_validate_settings' )</code>
	 * in their sanitize callbacks to determine whether they should be strict
	 * in how they sanitize the values, in other words to tell them whether they
	 * can return null or a WP_Error object to mark the setting as invalid.
	 *
	 * This is in lieu of there being a 'customize_validate_{$setting_id}' filter,
	 * or supplying an additional argument to 'customize_sanitize_{$setting_id}'
	 * which would indicate that strict validation should be employed.
	 *
	 * @param \WP_Customize_Manager $wp_customize Manager instance.
	 */
	public function do_customize_validate_settings( $wp_customize ) {
		do_action( 'customize_validate_settings', $wp_customize );
	}

	/**
	 * Early at the customize_save action, iterate over all settings and check for any that are invalid.
	 *
	 * If any of the settings are invalid, short-circuit the WP_Customize_Manager::save() call with a
	 * call to wp_send_json_error() sending back the invalid_settings.
	 *
	 * @access public
	 * @action customize_save
	 *
	 * @param \WP_Customize_Manager $wp_customize Customizer manager.
	 */
	public function validate_settings( \WP_Customize_Manager $wp_customize ) {
		/*
		 * Check to see if any of the registered settings are invalid, and for
		 * those that are invalid, build an array of the invalid messages.
		 */
		$unsanitized_post_values = $wp_customize->unsanitized_post_values();
		foreach ( $unsanitized_post_values as $setting_id => $unsanitized_value ) {
			$setting = $wp_customize->get_setting( $setting_id );
			if ( ! $setting ) {
				continue;
			}
			$sanitized_value = $setting->sanitize( $unsanitized_value );
			if ( is_null( $sanitized_value ) ) {
				$sanitized_value = new \WP_Error( 'invalid_value', __( 'Invalid value.', 'customize-setting-validation' ) );
			}
			if ( is_wp_error( $sanitized_value ) ) {
				$this->invalid_settings[ $setting_id ] = $sanitized_value->get_error_message();
			}
		}

		$invalid_count = count( $this->invalid_settings );

		// No invalid settings, do not short-circuit.
		if ( 0 === $invalid_count ) {
			return;
		}

		$response = array(
			'message' => sprintf( _n( 'There is %d invalid setting.', 'There are %d invalid settings.', $invalid_count, 'customize-setting-validation' ), $invalid_count ),
			'invalid_settings' => $this->invalid_settings,
		);

		/** This filter is documented in wp-includes/class-wp-customize-manager.php */
		$response = apply_filters( 'customize_save_response', $response, $wp_customize );

		/*
		 * This assumes that the method is being called in the context of
		 * WP_Customize_Manager::save(), which calls wp_json_send_success()
		 * at the end.
		 */
		wp_send_json_error( $response );
	}

	/**
	 * Keep track of which settings were actually saved.
	 *
	 * Note that the footwork with id_bases is needed because there is no
	 * action for customize_save_{$setting_id}.
	 *
	 * @access private
	 * @param \WP_Customize_Manager $wp_customize Customize manager.
	 * @action customize_save
	 */
	public function _add_actions_for_flagging_saved_settings( \WP_Customize_Manager $wp_customize ) {
		$seen_id_bases = array();
		foreach ( $wp_customize->settings() as $setting ) {
			$id_data = $setting->id_data();
			if ( ! isset( $seen_id_bases[ $id_data['base'] ] ) ) {
				add_action( 'customize_save_' . $id_data['base'], array( $this, '_flag_saved_setting_value' ) );
				$seen_id_bases[ $id_data['base'] ] = true;
			}
		}
	}

	/**
	 * Flag which settings were saved.
	 *
	 * @access private
	 * @param \WP_Customize_Setting $setting Saved setting.
	 * @see \WP_Customize_Setting::save()
	 * @action customize_save
	 */
	public function _flag_saved_setting_value( \WP_Customize_Setting $setting ) {
		$this->saved_setting_values[ $setting->id ] = null;
	}

	/**
	 * Gather the saved setting values.
	 *
	 * @param \WP_Customize_Manager $wp_customize Customizer manager.
	 * @action customize_save_after
	 */
	public function gather_saved_setting_values( \WP_Customize_Manager $wp_customize ) {
		$setting_ids = array_keys( $this->saved_setting_values );
		foreach ( $setting_ids as $setting_id ) {
			$setting = $wp_customize->get_setting( $setting_id );
			if ( $setting ) {
				$this->saved_setting_values[ $setting_id ] = $setting->js_value();
			}
		}
	}

	/**
	 * Export any invalid setting data to the Customizer JS client.
	 *
	 * @filter customize_save_response
	 *
	 * @param array $response Return value for customize-save Ajax request.
	 * @return array Return value for customize-save Ajax request.
	 */
	public function filter_customize_save_response( $response ) {
		if ( ! empty( $this->invalid_settings ) ) {
			$response['invalid_settings'] = $this->invalid_settings;
		}
		if ( ! empty( $this->saved_setting_values ) ) {
			$response['sanitized_setting_values'] = $this->saved_setting_values;
		}
		return $response;
	}

	/**
	 * Print templates.
	 */
	public function print_templates() {
		?>
		<script type="text/html" id="tmpl-customize-setting-validation-message">
			<ul>
				<# _.each( data.messages, function( message ) { #>
					<li>{{ message }}</li>
				<# } ); #>
			</ul>
		</script>
		<?php
	}
}
