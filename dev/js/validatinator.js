(function(window, def) {
  if (typeof module === "object" && module.exports) {
    module.exports = def();
  }

  window.Validatinator = def();
  require('./polyfills')();
})(window, function() {
  var extend = require('extend');

  /**
   * Core Validatinator class
   * @class Validatinator
   * @param {Object} validations
   * @param {Object} validations.formName
   * @param {string} validations.formName.fieldname - String containing field validations.
   * @param {Object} [errorMessages]
   * @param {Object} [errorMessages.formName]
   * @param {string} [errorMessages.formName.validationName] - New Validation error message.
   */
  function Validatinator(validations, errorMessages) {
    if (! (this instanceof Validatinator)) {
      throw new Error("Whoops!  Validatinator must be called with the new keyword!");
    }

    this.validationInformation = (validations !== undefined) ? this.utils.convertFieldValidationsToArray(validations) : {};
    this.errors = {};

    this.currentForm = null;
    this.currentField = null;

    this.validations.parent = this;
    this.messages.parent = this;
    this.validations.utils = this.utils;
    this.messages.utils = this.utils;

    if (errorMessages !== undefined) {
      this.messages.overwriteAndAddNewMessages(errorMessages);
    }
  }

  extend(Validatinator.prototype, {
    validations: require('./validations'),
    messages: require('./messages'),
    utils: require('./utils')
  });

  extend(Validatinator.prototype, {
    /**
     * Tests to see if the supplied form is valid.
     *
     * @memberof Validatinator
     * @instance
     * @see startValidations
     * @param {string} formName - String representation of the form's name attr.
     * @returns {Boolean} True if the form FAILS validation, else False.
     */
    fails: function(formName) {
      return ! this.startValidations(formName);
    },

    /**
     * Tests to see if the supplied form is valid.
     *
     * @memberof Validatinator
     * @instance
     * @see startValidations
     * @param {string} formName - String representation of the form's name attr.
     * @returns {Boolean} True if the form PASSES validation, else False.
     */
    passes: function(formName) {
      return this.startValidations(formName);
    },

    /**
     * Tests to see if the supplied form is valid.
     *
     * @memberof Validatinator
     * @instance
     * @param {string} formName - String representation of the form's name attr.
     * @returns {Boolean} True if the form PASSES validation, else False.
     */
    startValidations: function(formName) {
      var currentFieldsValidations,
          currentFieldsValue,
          currentValidationMethodAndParameters,
          fieldName,
          i;

      this.currentForm = formName;
      this.errors = {};

      for (fieldName in this.validationInformation[formName]) {
        this.currentField = fieldName;
        currentFieldsValidations = this.validationInformation[formName][fieldName];
        currentFieldsValue = this.utils.getFieldsValue(this.currentForm, this.currentField);

        for (i = 0; i < currentFieldsValidations.length; i++) {
          var method,
              parameters = [];

          currentValidationMethodAndParameters = this.getValidationMethodAndParameters(currentFieldsValidations[i]);
          method = currentValidationMethodAndParameters[0];

          // Check to see if our parameters actually exist, if they do, store them.
          if (currentValidationMethodAndParameters.length === 2) {
            parameters = currentValidationMethodAndParameters[1];
          }

          if (! this.callValidationMethod(method, parameters, currentFieldsValue)) {
            parameters.shift();
            this.messages.addValidationErrorMessage(method, parameters);
          }
        }
      }

      return this.utils.isEmptyObject(this.errors);
    },

    /**
     * Splits apart a validation string to retrieve it's validation method
     * name along with any parameters it requires.
     *
     * @memberof Validatinator
     * @instance
     * @param {string} validationString - String containing a validation method's
     *                                    signature, along with it's parameters
     *                                    supplied following a colon `:`.
     * @returns {string[]} Array containing the validation method in the
     *                     first index and all other indice are the validation
     *                     method's params.
     */
    getValidationMethodAndParameters: function(validationString) {
      var params,
          validation;

      // Assume there are not parameters if we have no colon.
      if (! validationString.contains(":")) {
        return [validationString];
      }

      params = validationString.split(":");
      validation = params.shift();

      return [validation, this.prepareParameters(params)];
    },

    /**
     * Prepares the parameter(s) so they can be used when making the validation
     * method call.
     *
     * @memberof Validatinator
     * @instance
     * @param {string} params - String containing parameters separated by colons.
     *                          (e.g. "param1:param2:param3:param4")
     * @returns {Any[]}
     */
    prepareParameters: function(params) {
      var i = 0,
          j = 0;

      for (; i < params.length; i++) {
        if (params[i].contains(",")) {
          params[i] = params[i].split(",");

          for (; j < params[i].length; j++) {
            params[i][j] = this.utils.convertStringToBoolean(params[i][j].trim());
          }
        } else {
          params[i] = this.utils.convertStringToBoolean(params[i].trim());
        }
      }

      return params;
    },

    /**
     * Attempts to call the validation method supplied with the provided parameters
     * and fieldValue.
     *
     * @memberof Validatiantor
     * @instance
     * @param {string} method - String representation of a validation method.
     * @param {string} fieldValue - Form's field's value.
     * @param {string[]} parameters - Other paramteres that the field validation
     *                                require.
     * @returns {Boolean} True if the validation passed, else False.
     */
    callValidationMethod: function(method, fieldValue, parameters) {
      if (! (method in this["validations"])) {
        throw new Error("Validation does not exist: " + method);
      }

      if (! parameters) {
        return this["validations"][method](fieldValue);
      }

      // Add the field value to the parameters array so we can use
      // .apply on the validation method's signature.
      parameters.unshift(fieldValue);

      return this["validations"][method].apply(this.validations, parameters);
    }
  });

  return Validatinator;
});
