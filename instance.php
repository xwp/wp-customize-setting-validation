<?php
/**
 * Instantiates the Customize Setting Validation plugin
 *
 * @package CustomizeSettingValidation
 */

namespace CustomizeSettingValidation;

global $customize_setting_validation_plugin;

require_once __DIR__ . '/php/class-plugin-base.php';
require_once __DIR__ . '/php/class-plugin.php';

$customize_setting_validation_plugin = new Plugin();

/**
 * Customize Setting Validation Plugin Instance
 *
 * @return Plugin
 */
function get_plugin_instance() {
	global $customize_setting_validation_plugin;
	return $customize_setting_validation_plugin;
}
