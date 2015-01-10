<?php
/**
 * Tests for Plugin class.
 *
 * @package CustomizeSettingValidation
 */

namespace CustomizeSettingValidation;

/**
 * Tests for Plugin class.
 *
 * @package CustomizeSettingValidation
 */
class Test_Plugin extends \WP_UnitTestCase {

	/**
	 * Test constructor.
	 *
	 * @see Plugin::__construct()
	 */
	public function test_construct() {
		$plugin = get_plugin_instance();
		$this->assertEquals( 10, has_action( 'after_setup_theme', array( $plugin, 'init' ) ) );
	}

	/**
	 * Test for init() method.
	 *
	 * @see Plugin::init()
	 */
	public function test_init() {
		$this->markTestIncomplete();
	}

	/* Put other test functions here... */
}
