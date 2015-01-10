<?php
/**
 * Test_Customize_Setting_Validation
 *
 * @package CustomizeSettingValidation
 */

namespace CustomizeSettingValidation;

/**
 * Class Test_Customize_Setting_Validation
 *
 * @package CustomizeSettingValidation
 */
class Test_Customize_Setting_Validation extends \WP_UnitTestCase {

	/**
	 * Test _customize_setting_validation_php_version_error().
	 *
	 * @see _customize_setting_validation_php_version_error()
	 */
	public function test_customize_setting_validation_php_version_error() {
		ob_start();
		_customize_setting_validation_php_version_error();
		$buffer = ob_get_clean();
		$this->assertContains( '<div class="error">', $buffer );
	}

	/**
	 * Test _customize_setting_validation_php_version_text().
	 *
	 * @see _customize_setting_validation_php_version_text()
	 */
	public function test_customize_setting_validation_php_version_text() {
		$this->assertContains( 'Customize Setting Validation plugin error:', _customize_setting_validation_php_version_text() );
	}
}
