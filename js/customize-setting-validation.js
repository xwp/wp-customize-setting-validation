/* global wp */

wp.customize.settingValidation = (function( $, api ) {
	var self;

	/**
	 * The component.
	 *
	 * @type {object}
	 */
	self = {};

	/**
	 * Decorate a Customizer control for validation message.
	 *
	 * @param {wp.customize.Control} control                     - Customizer control.
	 * @param {wp.customize.Value}   [control.validationMessage] - Validation message.
	 */
	self.setupControlForValidationMessage = function( control ) {
		if ( control.validationMessage ) {
			return;
		}
		control.validationMessage = new api.Value( '' );
		control.validationMessage.bind( function( newMessage ) {
			control.deferred.embedded.done( function() {
				var validationMessageElement = self.getSettingValidationMessageElement( control );
				if ( ! newMessage ) {
					control.container.removeClass( 'customize-setting-invalid' );
					validationMessageElement.slideUp( 'fast' );
				} else {
					control.container.addClass( 'customize-setting-invalid' );
					validationMessageElement.hide();
					validationMessageElement.text( newMessage );
					validationMessageElement.slideDown( 'fast' );
				}
			} );
		} );
	};

	/**
	 * Get/inject the element inside of a control's container that contains the validation error message.
	 *
	 * @param {wp.customize.Control} control - Customizer control.
	 * @returns {jQuery} Setting validation message element.
	 */
	self.getSettingValidationMessageElement = function( control ) {
		var controlTitle, validationMessageElement;

		validationMessageElement = control.container.find( '.customize-setting-validation-message:first' );
		if ( validationMessageElement.length ) {
			return validationMessageElement;
		}

		validationMessageElement = $( '<div class="customize-setting-validation-message error" aria-live="assertive"></div>' );

		if ( control.container.hasClass( 'customize-control-nav_menu_item' ) ) {
			control.container.find( '.menu-item-settings:first' ).prepend( validationMessageElement );
		} else if ( control.container.hasClass( 'customize-control-widget_form' ) ) {
			control.container.find( '.widget-inside:first' ).prepend( validationMessageElement );
		} else {
			controlTitle = control.container.find( '.customize-control-title' );
			if ( controlTitle.length ) {
				controlTitle.after( validationMessageElement );
			} else {
				control.container.append( validationMessageElement );
			}
		}
		return validationMessageElement;
	};

	/**
	 * Reset the validation messages and capture the settings that were dirty.
	 */
	self.beforeSave = function() {
		api.control.each( function( control ) {
			control.validationMessage.set( '' );
		} );
	};

	/**
	 * Handle a failure to save the Customizer settings.
	 *
	 * @param {object} response                   - Data sent back by customize-save Ajax request.
	 * @param {array} [response.invalid_settings] - IDs for invalid settings mapped to the validation messages.
	 */
	self.afterSaveFailure = function( response ) {
		var invalidControls = [], wasFocused = false;
		if ( ! response.invalid_settings || 0 === response.invalid_settings.length ) {
			return;
		}

		// Find the controls that correspond to each invalid setting.
		_.each( response.invalid_settings, function( invalidMessage, settingId ) {
			api.control.each( function( control ) {
				_.each( control.settings, function( controlSetting ) {
					if ( controlSetting.id === settingId ) {
						self.setupControlForValidationMessage( control ); // Make sure control.validationMessage is set.
						control.validationMessage.set( invalidMessage );
						invalidControls.push( control );
					}
				} );
			} );
		} );

		// Focus on the first control that is inside of an expanded section (one that is visible).
		_( invalidControls ).find( function( control ) {
			var isExpanded = control.section() && api.section.has( control.section() ) && api.section( control.section() ).expanded();
			if ( isExpanded && control.expanded ) {
				isExpanded = control.expanded();
			}
			if ( isExpanded ) {
				control.focus();
				wasFocused = true;
			}
			return wasFocused;
		} );

		// Focus on the first invalid control.
		if ( ! wasFocused && invalidControls[0] ) {
			invalidControls[0].focus();
		}

		// @todo Also display response.message somewhere.
	};

	api.control.bind( 'add', function( control ) {
		self.setupControlForValidationMessage( control );
	} );
	api.bind( 'save', function() {
		self.beforeSave();
	} );
	api.bind( 'error', function( response ) {
		self.afterSaveFailure( response );
	} );

	return self;

}( jQuery, wp.customize ) );
