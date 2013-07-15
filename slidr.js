//
// Copyright 2013. All Rights Reserved.
// Author: Brian Chan
// Contact: bchanx@gmail.com
//

/**
 * slidr - A simple Javascript library for adding slide effects. Currently under development.
 */

(function(window, document, undefined) {

  var Slidr = window.Slidr = function(id, opt_settings) {
    var _id = id;
    var _settings = _extend(opt_settings || {}, {
      'transition': 'none',
      'fading': true,
    });

    var self = this;

    /**
     * [List] of available slide transitions.
     */
    self.transitions = ['concave', 'cube', 'fade', 'linear', 'none'];

    /**
     * Start the Slidr!
     */
    self.start = function(opt_start) {
      if (!_started && _id && $(_id).length) {
        // Set the slide to start at.
        if (_isString(opt_start) && !!_slidr[opt_start]) {
          _start = opt_start;
        }
        $(_id).css({'position': 'relative', 'display': document.getElementById(_id.slice(1)).style.display || 'table'});
        _display();
        _autoResize();
        _started = true;
      }
      return self;
    };

    /**
     * Check whether we can slide.
     * @param {string} dir 'up', 'down', 'left' or 'right'.
     * @return {boolean}
     */
    self.canSlide = function(dir) {
      return _started && !!_lookup(_slidr, [_current, dir]);
    };

    /**
     * Slide.
     * @param {string} dir slide 'up', 'down', 'left', or 'right'.
     */
    self.slide = function(dir) {
      return _started && _slide(dir);
    };

    /**
     * Adds a set of horizontal slides.
     * @param {Array} slides A list of elements id's to add to Slidr. Elements must be direct children of the Slidr.
     * @param {String?} opt_transition The transition to apply between the slides, defaults to none.
     * @param {Boolean?} opt_overwrite Whether to overwrite existing slide mappings/transitions if conflicts occur.
     */
    self.horizontal = function(slides, opt_transition, opt_overwrite) {
      if (!!_id && $(_id).length) {
        _findValidSlides(_id);
        _add('horizontal', slides, opt_transition, opt_overwrite);
      }
    };

    /**
     * Adds a set of vertical slides.
     * @param {Array} slides A list of elements id's to add to Slidr. Elements must be direct children of the Slidr.
     * @param {String?} opt_transition The transition to apply between the slides, defaults to none.
     * @param {Boolean?} opt_overwrite Whether to overwrite existing slide mappings/transitions if conflicts occur.
     */
    self.vertical = function(slides, opt_transition, opt_overwrite) {
      if (!!_id && $(_id).length) {
        _findValidSlides(_id);
        _add('vertical', slides, opt_transition, opt_overwrite);
      }
    };

    /**
     * A {mapping} of slides to their neighbors.
     */
    var _slidr = {};

    /**
     * A {mapping} of slides and their transition effects.
     */
    var _transitions = {};

    /**
     * Valid slides contained in the DOM within our Slidr element.
     */
    var _validSlides = [];

    /**
     * Whether we've successfully called start().
     */
    var _started = false;

    /**
     * Whether we've successfully displayed the start slide.
     */
    var _displayed = false;

    /**
     * The slide to start at.
     */
    var _start = null;

    /**
     * The current slide.
     */
    var _current = null;

    /**
     * Helper for generating browser compatible CSS.
     */
    var _slidrCSS = new SlidrCSS();

    /**
     * Check if object is a string.
     */
    function _isString(obj) {
      return (!!obj) && (typeof obj === 'string');
    }

    /**
     * Check if object is an [Array].
     */
    function _isArray(obj) {
      return (!!obj) && (obj.constructor === Array);
    }

    /**
     * Check if object is an {Object}.
     */
    function _isObject(obj) {
      return (!!obj) && (obj.constructor === Object);
    }

    /**
     * Check if object is a {Function}.
     */
    function _isFunction(obj) {
      return (!!obj) && (typeof obj === 'function');
    }

    /**
     * Check if an object is empty.
     */
    function _isEmpty(obj) {
      if (_isObject(obj)) {
        for (var prop in obj) {
          if (obj.hasOwnProperty(prop)) {
            return false;
          }
        }
        return true;
      }
      return false;
    }

    /**
     * Traverse [keys] in {object} to lookup a value, or null if nothing found.
     */
    function _lookup(obj, keys) {
      var result = null;
      if (!!obj && obj.constructor === Object && !!keys && keys.constructor === Array) {
        result = obj;
        for (var k in keys) {
          if (!result.hasOwnProperty(keys[k])) {
            return null;
          }
          result = result[keys[k]];
        }
      }
      return result;
    }

    /**
     * Add all key:values found in [{from}, ..] to {to}, in place. Overwrites existing keys by default.
     */
    function _extend(from, to, opt_noOverwrite) {
      to = (_isObject(to)) ? to : {};
      if (_isObject(from)) {
        from = [from];
      }
      if (_isArray(from)) {
        var values;
        for (var i = 0; values = from[i]; i++) {
          for (var v in values) {
            if (to.hasOwnProperty(v) && !!opt_noOverwrite) {
              continue;
            }
            to[v] = values[v];
          }
        }
      }
      return to;
    }

    /**
     * Find all direct children of our Slidr with an id attribute.
     */
    function _findValidSlides(slidr) {
      _validSlides = [];
      if (!!slidr && slidr[0] === '#' && $(slidr).length) {
        $.each($(slidr).children(), function() {
          var id = $(this).attr('id');
          if (id !== "") {
            _validSlides.push('#' + id);
          }
        });
      }
      return _validSlides;
    }

    /**
     * Helper functions for generating css keyframes.
     */
    var _cssHelper = {
      'concave': function(animation, perspective, zStart, zEnd, translateStart, translateEnd,
        rotateStart, rotateEnd, opacityStart, opacityEnd) {
        _slidrCSS.createKeyframe(animation, {
          '0': { 'transform': 'perspective(' + perspective + 'px) translateZ(' + zStart + 'px)' +
                  ' translate' + translateStart + ' rotate' + rotateStart, 'opacity': opacityStart },
          '100': { 'transform': 'perspective(' + perspective + 'px) translateZ(' + zEnd + 'px)' +
                    ' translate' + translateEnd + ' rotate' + rotateEnd, 'opacity': opacityEnd }
        });
      },
      'cube': function(animation, rotateStart, rotateEnd, translateZ, opacityStart, opacityEnd) {
        _slidrCSS.createKeyframe(animation, {
          '0': { 'transform': 'rotate' + rotateStart + ' translateZ(' + translateZ + 'px)', 'opacity': opacityStart },
          '100': { 'transform': 'rotate' + rotateEnd + ' translateZ(' + translateZ + 'px)', 'opacity': opacityEnd }
        });
      },
      'fade': function(animation, opacityStart, opacityEnd) {
        _slidrCSS.createKeyframe(animation, { '0': { 'opacity': opacityStart }, '100': { 'opacity': opacityEnd } });
      },
      'linear': function(animation, translateStart, translateEnd, opacityStart, opacityEnd) {
        _slidrCSS.createKeyframe(animation, {
          '0': { 'transform': 'translate' + translateStart, 'opacity': opacityStart },
          '100': { 'transform': 'translate' + translateEnd, 'opacity': opacityEnd }
        });
      },
    };

    /**
     * Defines our available css transitions.
     */
    var _css = {
      'concave': {
        'supported': _slidrCSS.supports([
          'animation', 'perspective', 'backface-visibility', 'transform-style', 'transform', 'opacity']),
        'init': function() { 
          return _slidrCSS.fixup({
            'backface-visibility': 'hidden',
            'transform-style': 'preserve-3d'
          });
        },
        'timing': function(animation) { return animation + ' 0.8s cubic-bezier(0.2, 0.8, 0.4, 1) 0s'; },
        'in': {
          'left': function(w) { _cssHelper['concave']('slidr-concave-in-left',
            w*4, w, '0', 'X(80%)', 'X(0)', 'Y(-75deg)', 'Y(0)', _settings['fading'] ? '0' : '1', '1'); },
          'right': function(w) { _cssHelper['concave']('slidr-concave-in-right',
            w*4, w, '0', 'X(-80%)', 'X(0)', 'Y(75deg)', 'Y(0)', _settings['fading'] ? '0' : '1', '1'); },
          'up': function(h) { _cssHelper['concave']('slidr-concave-in-up',
            h*4, h, '0', 'Y(80%)', 'Y(0)', 'X(75deg)', 'X(0)', _settings['fading'] ? '0' : '1', '1'); },
          'down': function(h) { _cssHelper['concave']('slidr-concave-in-down',
            h*4, h, '0', 'Y(-80%)', 'Y(0)', 'X(-75deg)', 'X(0)', _settings['fading'] ? '0' : '1', '1'); },
        },
        'out': {
          'left': function(w) { _cssHelper['concave']('slidr-concave-out-left',
            w*4, '0', w, 'X(0)', 'X(80%)', 'Y(0)', 'Y(-75deg)', '1', _settings['fading'] ? '0' : '1'); },
          'right': function(w) { _cssHelper['concave']('slidr-concave-out-right',
            w*4, '0', w, 'X(0)', 'X(-80%)', 'Y(0)', 'Y(75deg)', '1', _settings['fading'] ? '0' : '1'); },
          'up': function(h) { _cssHelper['concave']('slidr-concave-out-up',
            h*4, '0', h, 'Y(0)', 'Y(80%)', 'X(0)', 'X(75deg)', '1', _settings['fading'] ? '0' : '1'); },
          'down': function(h) { _cssHelper['concave']('slidr-concave-out-down',
            h*4, '0', h, 'Y(0)', 'Y(-80%)', 'X(0)', 'X(-75deg)', '1', _settings['fading'] ? '0' : '1'); },
        }
      },
      'cube': {
        'supported': _slidrCSS.supports(['animation', 'backface-visibility', 'transform-style', 'transform', 'opacity']),
        'init': function() { 
          return _slidrCSS.fixup({
            'backface-visibility': 'hidden',
            'transform-style': 'preserve-3d'
          });
        },
        'timing': function(animation) { return animation + ' 1s cubic-bezier(0.15, 0.9, 0.25, 1) 0s'; },
        'in': {
          'left': function(w) { _cssHelper['cube']('slidr-cube-in-left',
            'Y(90deg)', 'Y(0deg)', w/2, _settings['fading'] ? '0' : '1', '1'); },
          'right': function(w) { _cssHelper['cube']('slidr-cube-in-right',
            'Y(-90deg)', 'Y(0deg)', w/2, _settings['fading'] ? '0' : '1', '1'); },
          'up': function(h) { _cssHelper['cube']('slidr-cube-in-up',
            'X(-90deg)', 'X(0deg)', h/2, _settings['fading'] ? '0' : '1', '1'); },
          'down': function(h) { _cssHelper['cube']('slidr-cube-in-down',
            'X(90deg)', 'X(0deg)', h/2, _settings['fading'] ? '0' : '1', '1'); },
        },
        'out': {
          'left': function(w) { _cssHelper['cube']('slidr-cube-out-left',
            'Y(0deg)', 'Y(90deg)', w/2, '1', _settings['fading'] ? '0' : '1'); },
          'right': function(w) { _cssHelper['cube']('slidr-cube-out-right',
            'Y(0deg)', 'Y(-90deg)', w/2, '1', _settings['fading'] ? '0' : '1'); },
          'up': function(h) { _cssHelper['cube']('slidr-cube-out-up',
            'X(0deg)', 'X(-90deg)', h/2, '1', _settings['fading'] ? '0' : '1'); },
          'down': function(h) { _cssHelper['cube']('slidr-cube-out-down',
            'X(0deg)', 'X(90deg)', h/2, '1', _settings['fading'] ? '0' : '1'); },
        }
      },
      'fade': {
        'supported': _slidrCSS.supports(['animation', 'opacity']),
        'init': function() {
          _cssHelper['fade']('slidr-fade-in', '0', '1');
          _cssHelper['fade']('slidr-fade-out', '1', '0');
          return null; 
        },
        'timing': function(animation) { return animation + ' 0.4s ease-out 0s'; },
      },
      'linear': {
        'supported': _slidrCSS.supports(['transform', 'opacity']),
        'init': function() { return null; },
        'timing': function(animation) { return animation + ' 0.6s ease-out 0s'; },
        'in': {
          'left': function(w) { _cssHelper['linear']('slidr-linear-in-left',
            'X(' + w + 'px)', 'X(0px)', _settings['fading'] ? '0' : '1', '1'); },
          'right': function(w) { _cssHelper['linear']('slidr-linear-in-right',
            'X(-' + w + 'px)', 'X(0px)', _settings['fading'] ? '0' : '1', '1'); },
          'up': function(h) { _cssHelper['linear']('slidr-linear-in-up',
            'Y(' + h + 'px)', 'Y(0px)', _settings['fading'] ? '0' : '1', '1'); },
          'down': function(h) { _cssHelper['linear']('slidr-linear-in-down',
            'Y(-' + h + 'px)', 'Y(0px)', _settings['fading'] ? '0' : '1', '1'); },
        },
        'out': {
          'left': function(w) { _cssHelper['linear']('slidr-linear-out-left',
            'X(0px)', 'X(' + w + 'px)', '1', _settings['fading'] ? '0' : '1'); },
          'right': function(w) { _cssHelper['linear']('slidr-linear-out-right',
            'X(0px)', 'X(-' + w + 'px)', '1', _settings['fading'] ? '0' : '1'); },
          'up': function(h) { _cssHelper['linear']('slidr-linear-out-up',
            'Y(0px)', 'Y(' + h + 'px)', '1', _settings['fading'] ? '0' : '1'); },
          'down': function(h) { _cssHelper['linear']('slidr-linear-out-down',
            'Y(0px)', 'Y(-' + h + 'px)', '1', _settings['fading'] ? '0' : '1'); },
        }
      },
      'none': {
        'supported': true,
        'init': function() { return null; },
        'timing': function() { return null; },
      }
    };

    /**
     * CSS rules to apply to slides in our Slidr on initialize.
     */
    function _cssInit(element, transition) {
      if (element && $(element).length) {
        var css = _lookup(_css, [transition, 'init'])() || {};
        if (!_slidr[element]['initialized']) {
          var display = $(element).css('display');
          var extra = {
            'display': (display === 'none') ? 'block' : display,
            'position': 'absolute',
            'left': '50%',
            'margin-left': '-' + $(element).width()/2 + 'px',
            'opacity': '0',
            'z-index': '0',
            'pointer-events': 'none'
          };
          _extend(extra, css);
          _slidr[element]['initialized'] = true;
        }
        $(element).css(css);
        return true;
      }
      return false;
    }

    /**
     * Resolve keyframe animation name.
     */
    function _cssAnimationName(transition, type, dir) {
      var parts = ['slidr', transition, type];
      if (transition !== 'fade' && dir) {
        parts.push(dir);
      }
      return parts.join('-');
    }

    /**
     * Animate the `element` coming [in|out] as `type`, from the `dir` direction with `transition` effects.
     */
    function _cssAnimate(element, transition, type, dir) {
      if (element && $(element).length && type) {
        var css = {
          'opacity': (type === 'in') ? '1': '0',
          'z-index': (type === 'in') ? '1': '0',
          'pointer-events': (type === 'in') ? 'auto': 'none'
        };
        if (transition && _lookup(_css, [transition, 'supported'])) {
          var animation = _slidrCSS.resolve('animation');
          var timing = _lookup(_css, [transition, 'timing']);
          if (animation && _isFunction(timing)) {
            if (dir) {
              var keyframe = _lookup(_css, [transition, type, dir]);
              if (_isFunction(keyframe)) {
                (dir === 'up' || dir === 'down') ? keyframe($(element).height()) : keyframe($(element).width());
              }
            }
            timing = timing(_cssAnimationName(transition, type, dir));
            css[animation] = timing;
          }
        }
        $(element).css(css);
        return true;
      }
      return false;
    }

    /**
     * Get the next transition for `element` entering/leaving the viewport from `dir` direction.
     */
    function _getTransition(element, dir) {
      return _lookup(_transitions, [element, dir]);
    }

    /**
     * Validate a transition.
     */
    function _validateTransition(transition) {
      return (!transition 
        || self.transitions.indexOf(transition) < 0
        || !_lookup(_css, [transition, 'supported'])) ? _settings['transition'] : transition;
    }

    /**
     * Set the `transition` for an `element` going in the `dir` movement.
     */
    function _setTransition(element, dir, transition) {
      transition = _validateTransition(transition);
      if (!_transitions[element]) {
        _transitions[element] = {};
      }
      _transitions[element][dir] = transition;
      return transition;
    }

    /**
     * Apply a transition to an `element`, coming [in|out] of the Slidr as `type`, in the `dir` direction.
     */
    function _applyTransition(element, type, dir) {
      if (element && $(element).length && type && dir) {
        var transition = _getTransition(element, dir);
        if (transition) {
          return _cssAnimate(element, transition, type, dir);
        }
      }
      return false;
    }

    /**
     * Returns the opposite direction.
     */
    function _opposite(dir) {
      return (dir === 'up') ? 'down' : (dir === 'down') ? 'up' : (dir === 'left') ? 'right' : 'left';
    }

    /**
     * Check if a Slidr transition will have overflow issues.
     */
    function _hasOverflow(current, next, dir) {
      var overFlow = { 'linear': true };
      current = _getTransition(current, dir);
      next = _getTransition(next, _opposite(dir));
      return ((dir === 'left' || dir === 'right') && (overFlow[current] || overFlow[next]));
    }

    /**
     * Transition to the next slide in the `dir` direction.
     */
    function _slide(dir) {
      var next = _lookup(_slidr, [_current, dir]);
      if (!!_current && !!next) {
        $(_current).stop();
        $(_id).css('overflow', (_hasOverflow(_current, next, dir)) ? 'hidden' : 'auto');
        _applyTransition(_current, 'out', dir);
        _current = next;
        _applyTransition(next, 'in', _opposite(dir));
        return true;
      }
      return false;
    }

    /**
     * Display our starting slide.
     */
    function _display() {
      if (!_displayed && _start && $(_start).length && !!_slidr[_start]) {
        // Hide/show to force a redraw.
        _current = _start;
        _cssInit(_current, 'fade');
        _cssAnimate(_current, 'fade', 'in');
        _displayed = true;
        return true;
      }
      return false;
    }

    /**
     * Watch for height and width changes in the slides, propagate the change to the slidr container.
     */
    function _autoResize() {
      var height = 0;
      var width = 0;
      var isDynamicHeight = document.getElementById(_id.slice(1)).style.height === '';
      var isDynamicWidth = document.getElementById(_id.slice(1)).style.width === '';
      var timerId = setInterval((function watchDimensions() {
        if (!$(_id).length) {
          clearInterval(timerId);
          return;
        } else if ($(_id).css('visibility') === 'hidden') {
          height = _setHeight(0);
          width = _setWidth(0);
        } else {
          var newHeight = $(_current).height() || 0;
          if (isDynamicHeight && height != newHeight) {
            height = _setHeight(newHeight);
          }
          var parentWidth = $(_id).parent().width() || 0;
          var newWidth = $(_current).width() || 0;
          var ignorePadding = false;
          if (parentWidth > newWidth) {
            newWidth = parentWidth;
            ignorePadding = true;
          }
          if (isDynamicWidth && width != newWidth) {
            width = _setWidth(newWidth, ignorePadding);
          }
        }
        return watchDimensions;
      })(), 250);
    }

    /**
     * Sets the height of our Slidr container.
     */
    function _setHeight(height) {
      if ($(_id).length) {
        var padding = parseInt($(_id).css('padding-top').slice(0, -2)) +
          parseInt($(_id).css('padding-bottom').slice(0, -2));
        $(_id).css('height', height + padding + 'px');
        return height;
      }
      return null;
    }

    /**
     * Sets the width of our Slidr container.
     */
    function _setWidth(width, ignorePadding) {
      if ($(_id).length) {
        var padding = (!!ignorePadding) ? 0 : parseInt($(_id).css('padding-left').slice(0, -2)) +
          parseInt($(_id).css('padding-right').slice(0, -2));
        var margin = parseInt($(_id).css('margin-left').slice(0, -2)) +
          parseInt($(_id).css('margin-right').slice(0, -2));
        $(_id).css('width', width + padding - margin + 'px');
        return width;
      }
      return null;
    }

    /**
     * Validate the slides we're trying to add isn't going to conflict with existing mapping.
     */
    function _validateAdd(dir, slides, transition) {
      if (!_isArray(slides) || !dir) {
        return false;
      }
      var prev = (dir === 'horizontal') ? 'left' : 'up';
      var next = (dir === 'horizontal') ? 'right' : 'down';
      var current;
      // For each slide we're trying to add, check it against our known mapping.
      for (var i = 0; current = slides[i]; i++) {
        if (!current || !$(current).length || _validSlides.indexOf(current) < 0) {
          return false;
        }
        if (_slidr[current]) {
          var newPrev = slides[i-1] || null;
          var newNext = slides[i+1] || null;
          var existingPrev = _slidr[current][prev] || null;
          var existingNext = _slidr[current][next] || null;
          var existingPrevTransition = _lookup(_transitions, [current, prev]);
          var existingNextTransition = _lookup(_transitions, [current, next]);
          var previousPrev = _lookup(_slidr, [newNext, prev]);
          // Are we about to override an existing mapping?
          if ((existingNext && newNext && existingNext != newNext)
            || (existingPrev && newPrev && existingPrev != newPrev)
            || (previousPrev && previousPrev != current)
            || (newPrev && existingPrevTransition && existingPrevTransition != transition)
            || (newNext && existingNextTransition && existingNextTransition != transition)
          ) {
            return false;
          }
        }
      }
      return true;
    }

    /**
     * Adds a [list] of slides we want to navigate in the horizontal/vertical direction.
     */
    function _add(dir, slides, opt_transition, opt_overwrite) {
      var transition = _validateTransition(opt_transition);
      if (!_validateAdd(dir, slides, transition) && !opt_overwrite) {
        if (!!console && !!console.log) {
          console.log('[Slidr] ' + dir + ' add error, conflicts with existing mapping.');
        }
        return false;
      }
      var prev = (dir === 'horizontal') ? 'left' : 'up';
      var next = (dir === 'horizontal') ? 'right' : 'down';
      var current;
      // For each slide, add it to our mapping.
      for (var i = 0; current = slides[i]; i++) {
        if (!_isObject(_slidr[current])) {
          _slidr[current] = {};
        }
        if (!!slides[i-1]) {
          _slidr[current][prev] = slides[i-1];
          _setTransition(current, prev, transition);
        }
        if (!!slides[i+1]) {
          _slidr[current][next] = slides[i+1];
          _setTransition(current, next, transition);
        }
        _cssInit(current, transition);
        _start = (!_start) ? current : _start;
      }
      if (_started && !_displayed) {
        _display();
      }
      return true;
    }

    /**
     * Helper for creating Slidr CSS.
     */
    function SlidrCSS() {

      var self = this;

      /**
       * Resolves a css property name to the browser supported name, or null if not supported.
       */
      self.resolve = function(cssProperty) {
        if (_propertyCache[cssProperty] !== undefined) {
          return _propertyCache[cssProperty];
        }
        var result = _normalize(cssProperty);
        if (_style[result] !== undefined) {
          _propertyCache[cssProperty] = cssProperty;
          return cssProperty;
        }
        var prefix = _getDOMPrefix(cssProperty);
        if (!!prefix) {
          result = _normalize(cssProperty, prefix);
          if (_style[result] !== undefined) {
            _propertyCache[cssProperty] = _getCSSPrefix() + cssProperty;
            return _getCSSPrefix() + cssProperty;
          }
        }
        // Browser does not support this property.
        _propertyCache[cssProperty] = null;
        return null;
      };

      /**
       * Check whether all given css properties are supported in the browser.
       */
      self.supports = function(properties) {
        if (_isString(properties)) {
          properties = [properties];
        }
        if (_isArray(properties)) {
          for (var i = 0; i < properties.length; i++) {
            if (!self.resolve(properties[i])) {
              return false;
            }
          }
          return true;
        }
        return false;
      };

      /**
       * Applies necessary CSS browser prefixes for a set of properties.
       */
      self.fixup = function(properties) {
        var result = {};
        if (_isObject(properties)) {
          for (var p in properties) {
            if (self.resolve(p)) {
              result[self.resolve(p)] = properties[p];
            }
          }
        }
        return result;
      };

      /**
       * Creates a keyframe animation rule.
       */
      self.createKeyframe = function(name, rules) {
        // Make sure we support animations.
        if (!self.resolve('animation')) {
          return false;
        }
        // Make sure all animation properties are supported.
        for (var r in rules) {
          var properties = rules[r];
          for (var p in properties) {
            if (!self.resolve(p)) {
              return false;
            }
          }
        }
        var prefix = _cssPrefix || '';
        var rule = ['@' + prefix + 'keyframes ' + name + ' {'];
        for (var r in rules) {
          rule.push(r + '% {');
          var properties = rules[r];
          for (var p in properties) {
            rule.push(self.resolve(p) + ': ' + properties[p] + ';');
          }
          rule.push('}');
        }
        rule.push('}');
        rule = rule.join(' ');
        _addKeyframeRule(name, rule);
      };

      /**
       * Pointer to the document style sheets.
       */
      var _style = document.getElementsByTagName('html')[0]['style'];

      /**
       * Pointer to our Slidr CSS style sheet.
       */
      var _styleSheet = null;

      /**
       * The CSS prefix for the displaying browser.
       */
      var _cssPrefix = null;

      /**
       * The DOM prefix for the displaying browser.
       */
      var _domPrefix = null;

      /**
       * The CSS property to prefix mapping.
       */
      var _propertyCache = {};

      /**
       * Adds a CSS keyframe rule to our custom stylesheet.
       */
      function _addKeyframeRule(name, rule) {
        if (!_styleSheet) {
          var styleSheetIndex = 0;
          if (document.styleSheets && document.styleSheets.length) {
            styleSheetIndex = document.styleSheets.length;
          }
          var style = document.createElement('style');
          document.head.appendChild(style);
          _styleSheet = document.styleSheets[styleSheetIndex];
        }
        var rules = _styleSheet.cssRules;
        for (var r = 0; r < rules.length; r++) {
          // Delete the rule if it already exists.
          if (rules[r]['name'] == name) {
            _styleSheet.deleteRule(r);
            break;
          }
        }
        // Now insert it. 
        _styleSheet.insertRule(rule, rules.length);
      }

      /**
       * Given a css property and a optional dom prefix, tranlate it into a DOM document representation.
       */
      function _normalize(cssProperty, opt_domPrefix) {
        var property = cssProperty;
        if (_isString(property)) {
          property = property.split('-');
          for (var i = 0; i < property.length; i++) {
            var part = property[i];
            property[i] = part[0].toUpperCase() + part.toLowerCase().slice(1);
          }
          if (!!opt_domPrefix) {
            property.unshift(opt_domPrefix);
          } else {
            property[0] = property[0].toLowerCase();
          }
          property = property.join('');
        }
        return property;
      }

      /**
       * Given a css property, retrieves the DOM prefix if applicable.
       */
      function _getDOMPrefix(cssProperty) {
        if (_domPrefix === null && _isString(cssProperty)) {
          var DOMPrefixes = ['Webkit', 'Moz', 'ms', 'O', 'Khtml'];
          for (var i = 0; i < DOMPrefixes.length; i++) {
            if (_style[_normalize(cssProperty, DOMPrefixes[i])] !== undefined) {
              _domPrefix = DOMPrefixes[i];
              _cssPrefix = '-' + DOMPrefixes[i].toLowerCase() + '-';
              break;
            }
          }
        }
        return _domPrefix;
      }

      /**
       * Given a css property, retrieves the browser prefix if applicable.
       */
      function _getCSSPrefix(cssProperty) {
        if (_cssPrefix === null && _isString(cssProperty)) {
          _getDOMPrefix(cssProperty);
        }
        return _cssPrefix;
      }
    };
  };
}(window, document));

