/* global wp */

wp.customize.settingValidation = (function( $, api ) {
	var self;

	/**
	 * The component.
	 *
	 * @type {object}
	 */
	self = {
		l10n: {
			invalidValue: ''
		},
		validationMessageTemplate: wp.template( 'customize-setting-validation-message' )
	};

	/**
	 * Decorate a Customizer control for validation message.
	 *
	 * In Core, this would be part of wp.customize.Setting.prototype.initialize.
	 *
	 * @param {wp.customize.Setting} setting                     - Customizer setting.
	 * @param {wp.customize.Value}   [setting.validationMessage] - Validation message.
	 * @param {wp.customize.Value}   [setting.valid]             - Validation message.
	 */
	self.setupSettingForValidationMessage = function( setting ) {
		var previousValidate;
		if ( setting.validationMessage ) {
			return;
		}
		setting.validationMessage = new api.Value( '' );
		setting.valid = new api.Value( true );
		previousValidate = setting.validate;
		setting.validate = function( inputValue ) {
			var validatedValue = previousValidate.call( setting, inputValue );

			// @todo Problem: validate block the value from getting saved to the setting, so it will not end up being invalid.
			// @todo add setting.sanitize()
			if ( validatedValue instanceof Error ) {
				setting.validationMessage.set( validatedValue.message );
				validatedValue = null;
			} else if ( null === validatedValue ) {
				setting.validationMessage.set( self.l10n.invalidValue );
			} else {
				setting.validationMessage.set( '' );
			}
			return validatedValue;
		};
	};

	/**
	 * Decorate a Customizer control for validation message.
	 *
	 * In Core, this would be part of wp.customize.Control.prototype.initialize.
	 *
	 * @param {wp.customize.Control} control - Customizer control.
	 * @param {wp.customize.Values}  control._settingValidationMessages - Customizer control.
	 */
	self.setupControlForValidationMessage = function( control ) {
		control._settingValidationMessages = new api.Values();

		_.each( control.settings, function( setting ) {
			control._settingValidationMessages.add( setting.id, setting.validationMessage );
		} );

		control._settingValidationMessages.bind( 'change', function() {
			control.deferred.embedded.done( function() {
				var validationMessageElement = self.getSettingValidationMessageElement( control ),
					validationMessages = [];
				control._settingValidationMessages.each( function( validationMessage ) {
					if ( validationMessage.get() ) {
						validationMessages.push( validationMessage.get() );
					}
				} );

				if ( 0 === validationMessages.length ) {
					validationMessageElement.slideUp( 'fast' );
				} else {
					validationMessageElement.slideDown( 'fast' );
				}

				control.container.toggleClass( 'customize-setting-invalid', 0 === validationMessages.length );
				validationMessageElement.empty().append( $.trim(
					self.validationMessageTemplate( { messages: validationMessages } )
				) );
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
		api.each( function( setting ) {
			if ( setting.validationMessage ) {
				setting.validationMessage.set( '' );
			}
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
			var setting = api( settingId );
			if ( setting ) {
				setting.validationMessage.set( invalidMessage );
			}

			api.control.each( function( control ) {
				_.each( control.settings, function( controlSetting ) {
					if ( controlSetting.id === settingId ) {
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

	api.bind( 'add', function( setting ) {
		self.setupSettingForValidationMessage( setting );
	} );
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
