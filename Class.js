'use strict';
////////////////////////////////////////////////////////////////////////////////
//
// Class.js
//
// Copyright 2014 N3TWORK
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
//
// Based on work from:
//   Simple JavaScript Inheritance
//   By John Resig http://ejohn.org/
//   MIT Licensed.
//   Inspired by base2 and Prototype
//
//   http://ejohn.org/blog/simple-javascript-inheritance/ 
//
///////////////////////////////////////////////////////////////////////////////
(function(){
  var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
 
  // The base Class implementation (does nothing)
  this.Class = function(){};
 
  Class.prototype.addEventListener = function(type, listener, useCapture)
  {
	  if(!this.__eventListenersByEvent)
	  {
		  this.__eventListenersByEvent = [];
	  }
	  
	  if(!(type in this.__eventListenersByEvent))
	  {
	  	  this.__eventListenersByEvent[type] = [];
	  }
	  
	  if(!(listener in this.__eventListenersByEvent[type]))
	  {
		  this.__eventListenersByEvent[type].push(listener);
	  }
  }
  
  Class.prototype.removeEventListener = function(type, listener, useCapture)
  {
	  if(this.__eventListenersByEvent && (type in this.__eventListenersByEvent))
	  {
		  var idx = this.__eventListenersByEvent[type].indexOf(listener);
		  if(-1 !== idx)
		  {
			  this.__eventListenersByEvent[type].splice(idx,1);
		  }
	  }
  }
  
  // Send event to all listeners on this class.
  Class.prototype.dispatchEvent = function(event)
  {
	  if(this.__eventListenersByEvent && (event.type in this.__eventListenersByEvent))
	  {
		  for(var l in this.__eventListenersByEvent[event.type])
		  {
			  var curr = this.__eventListenersByEvent[event.type][l];
			  curr(event);
		  }
	  }
  }
 
  // Create a new Class that inherits from this class
  Class.extend = function(prop) {
    var _super = this.prototype;
   
    // Instantiate a base class (but only create the instance,
    // don't run the init constructor)
    initializing = true;
    var prototype = new this();
    initializing = false;
   
    // Copy the properties over onto the new prototype
    for (var name in prop) {
      // Check if we're overwriting an existing function
      prototype[name] = typeof prop[name] == "function" &&
        typeof _super[name] == "function" && fnTest.test(prop[name]) ?
        (function(name, fn){
          return function() {
            var tmp = this._super;
            // Add a new ._super() method that is the same method
            // but on the super-class
            this._super = _super[name];
           
            // The method only need to be bound temporarily, so we
            // remove it when we're done executing
            var ret = fn.apply(this, arguments);        
            this._super = tmp;
            return ret;
          };
        })(name, prop[name]) :
        prop[name];
		// Set name to aid in debugging
		prop[name].prototype.name = name;
    }
   
    // The dummy class constructor
    function Class() {
      // All construction is actually done in the init method
      if ( !initializing && this.init )
        this.init.apply(this, arguments);
    }
   
    // Populate our constructed prototype object
    Class.prototype = prototype;
   
    // Enforce the constructor to be what we expect
    Class.prototype.constructor = Class;
 
    // And make this class extendable
    Class.extend = arguments.callee;
   
    return Class;
  };
})();

(function ( Class ){
	/////////////////////////////////////////////////////////////////////
	//  ** ADD PROPERTY OBSERVATION TO Class **
	/////////////////////////////////////////////////////////////////////

	function ObserverSet(hostObject) {
		var _observers = {};
		/** .add registers a *property name*, to notify an *observer*, via a *callback*.
			
			Example: 
			ModelObject.observers.add("name", DOMNode, function(object, newVal, propName) {
				this.textContenxt = "Name is now: " + newVal;
			}); 
		*/
		this.add = function(property, observer, cb) {
			if (!_observers.hasOwnProperty(property)) {
				_observers[property] = [];
			}
			var alreadyPresent = _observers[property].some(function(registration) {
				return registration.observer === observer;
			});
			if (!alreadyPresent) {
				_observers[property].push({"observer":observer, "callback": cb});
				var currentValue = this[property];
				if (typeof currentValue !== 'undefined') {
					cb.call(observer, this, currentValue, property);
				}
			}
		}.bind(hostObject);
		/** When removing properties, you may supply undefined as the property name to
		remove all registrations owned by observer. */
		this.remove = function(property, observer) {
			if (typeof property === 'undefined') {
				// console.log("Removing all properties for observer", observer);
				var properties = Object.getOwnPropertyNames(_observers);
				var propertiesLen = properties.length >>> 0;
				for (var i = 0; i < propertiesLen; i++) {
					var propName = properties[i];
					_observers[propName] = _observers[propName].filter( function(registration) {
						return registration.observer !== observer;
					});
				}
			}
			if (_observers.hasOwnProperty(property)) {
				_observers[property] = _observers[property].filter( function(registration) {
					return registration.observer !== observer;
				});
			}
		}.bind(hostObject);
		this.notify = function(property, value) {
			// console.log("Notifying", property, value, _observers[property]);
			if (_observers.hasOwnProperty(property)) {
				var registrations = _observers[property];
				registrations.forEach(function(registration) {
					registration.callback.call(registration.observer, this, value, property);
				}.bind(this));
			}
		}.bind(hostObject);
		return this;
	}
	
	var observerGetter = function() {
		if (this && !this.hasOwnProperty('_observers')) {
			this._observers = new ObserverSet(this);
		}
		return this._observers;
	};

	Object.defineProperty(Class.prototype, "observers", { get: observerGetter });

	Class.addObservableProperty = function(object, propName, customGetter, customSetter) {
		var varName = "_" + propName;
		// If customSetter is supplied, it must return *true* when observers should be notified.
		var getter;
		if (typeof customGetter === 'function') {
			getter = customGetter;
		} else {
			getter = function() {
				return this[varName];
			};
		}
		var setter = customSetter;
		if (typeof customSetter === 'function') {
			var setter = function(newVal) {
				if (customSetter.call(this, newVal)) {
					this.observers.notify(propName, newVal);
				}
			}
		} else {
			setter = function(newVal) {
				this[varName] = newVal;
				this.observers.notify(propName, newVal);
			}
		}
		Object.defineProperty(object, propName, {
			get: getter,
			set: setter
		});
	}

	// RETURNS an anonymous setter function that should be called thusly: setter(object, newValue);
	Class.addPrivateObservableProperty = function(object, propName) {
		var array = Array();
		for (var i = 0; i < 4; i++) {
			array.push( ((Math.random() * 60466176) >>> 0).toString(36) ); // Five base36 characters (36^5)
		}
		var secretVarName = array.join('');
		secretVarName = "_" + propName + "_" + secretVarName; // For debugging, don't use propName in production.
		Object.defineProperty(object, propName, {
			get: function() {
				return this[secretVarName];
			},
		});
		return function(object, newValue) {
			object[secretVarName] = newValue;
			object.observers.notify(propName, newValue);
		};
	}
})(Class);

module.exports = Class;
