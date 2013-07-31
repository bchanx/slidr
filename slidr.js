//
// Copyright 2013. All Rights Reserved.
// Author: Brian Chan
// Contact: bchanx@gmail.com
//

/**
 * slidr - A Javascript library for adding slide effects. Currently under development.
 */
(function(root, factory) {
  // CommonJS
  if (typeof exports === 'object') module.exports = factory();

  // AMD module
  else if (typeof define === 'function' && define.amd) define(factory);

  // Browser globals
  else root.slidr = factory();

} (this, function() {
  'use strict';

  // Traverse [keys] in {object} to lookup a value, or null if nothing found.
  function lookup(obj, keys) {
    var result = obj;
    for (var k in keys) {
      if (!result.hasOwnProperty(keys[k])) return null;
      result = result[keys[k]];
    }
    return (result === obj) ? null : result;
  }

  // Merge all properties from {arguments} to {obj}. Overwrites.
  function extend(obj /* arg1, arg2.. */) {
    var arg;
    for (var i = 1; arg = arguments[i]; i++) for (var a in arg) obj[a] = arg[a];
    return obj;
  }

  // Check whether node a contains node b.
  function contains(a, b) {
    return (a.contains) ? a.contains(b) : a.compareDocumentPosition(b) & 16;
  }

  // Check if object is a string.
  function isString(obj) {
    return typeof obj === 'string';
  }

  // Helper for generating browser compatible CSS.
  var _slidrCSS = new SlidrCSS();

  // If `props` is a string, do a css lookup. Otherwise, add css styles to `el`.
  function css(el, props) {
    if (isString(props)) {
      var style = window.getComputedStyle(el)[_slidrCSS.resolve(props)];
      return (style) ? (style.slice(-2) === 'px' && style.indexOf('px') == style.length - 2) ? 
        parseInt(style.slice(0, -2)) : style : 'none';
    }
    for (var p in props) if (_slidrCSS.resolve(p)) el.style[_slidrCSS.resolve(p)] = props[p];
    return el;
  }

  // The Slidr constructor.
  var Slidr = function(id, target, opt_settings) {

    var _ = {
      // Slidr id.
      id: id,

      // Reference to the Slidr element.
      slidr: target,

      // Settings for this Slidr.
      settings: extend({
        'transition': 'none',
        'direction': 'horizontal',
        'fading': true
      }, opt_settings),

      // Whether we've successfully called start().
      started: false,

      // Whether we've successfully called slides.display().
      displayed: false,

      // The slide to start at.
      start: null,

      // The current slide.
      current: null
    }

    var transition = {

      // A {mapping} of slides and their transition effects.
      map: {},

      // Available transitions.
      available: ['cube', 'fade', 'linear', 'none'],

      // Validates a given transition.
      validate: function(trans) {
        return (transition.available.indexOf(trans) < 0
          || !lookup(_css, [trans, 'supported'])) ? _.settings['transition'] : trans;
      },

      // Get the direction transition for an element.
      get: function(el, type, dir) {
        dir = (type === 'in') ? (dir === 'up') ? 'down': (dir === 'down') ? 'up' : (dir === 'left') ? 'right' : 'left' : dir;
        return lookup(transition.map, [el, dir]);
      },

      // Sets the direction transition for an element.
      set: function(el, dir, trans) {
        trans = transition.validate(trans);
        if (!transition.map[el]) transition.map[el] = {};
        transition.map[el][dir] = trans;
        return trans;
      },

      // Applies a directional transition to an element entering/leaving the Slidr.
      apply: function(el, type, dir) {
        var trans = transition.get(el, type, dir);
        if (trans) fx.animate(el, trans, type, dir);
      }
    };

    var slides = {

      // A {mapping} of slides to their neighbors.
      map: {},

      // Get slide metadata.
      get: function() {
        return lookup(slides.map, arguments);
      },

      // Display our starting slide.
      display: function() {
        if (!_.displayed && slides.get(_.start)) {
          _.current = _.start;
          fx.init(_.current, 'fade');
          fx.animate(_.current, 'fade', 'in');
          _.displayed = true;
        }
      },

      // Transition to the next slide in direction `dir`.
      slide: function(dir) {
        var next = slides.get(_.current, dir);
        if (_.current && next) {
          transition.apply(_.current, 'out', dir);
          _.current = next;
          transition.apply(next, 'in', dir);
          return true;
        }
        return false;
      },

      // Finds all valid slides (direct children with 'data-slidr' attributes).
      find: function(opt_asList) {
        var valid = (opt_asList) ? [] : {};
        var slide, name;
        for (var i = 0; slide = _.slidr.childNodes[i]; i++) {
          if (slide.getAttribute) {
            name = slide.getAttribute('data-slidr');
            if (name) {
              if (opt_asList && valid.indexOf(name) < 0) valid.push(name);
              else if (!(name in valid)) valid[name] = slide;
            }
          }
        }
        return valid;
      },

      // Validate the [ids] we're trying to add doesn't conflict with existing slide assignments.
      validate: function(ids, trans, valid, prev, next) {
        if (!ids || ids.constructor !== Array) return false;
        var current;
        // For each slide we're trying to add, check it against our known mapping.
        for (var i = 0; current = ids[i]; i++) {
          if (!(current in valid)) return false;
          if (slides.get(current)) {
            var newPrev = ids[i-1] || null;
            var newNext = ids[i+1] || null;
            var oldPrev = slides.get(current, prev);
            var oldNext = slides.get(current, next);
            var previousPrev = slides.get(newNext, prev);
            var oldPrevTrans = transition.get(current, 'out', prev);
            var oldNextTrans = transition.get(current, 'out', next);
            // Are we about to override an existing mapping?
            if ((oldNext && newNext && oldNext != newNext)
              || (oldPrev && newPrev && oldPrev != newPrev)
              || (previousPrev && previousPrev != current)
              || (newPrev && oldPrevTrans && oldPrevTrans != trans)
              || (newNext && oldNextTrans && oldNextTrans != trans)
            ) {
              return false;
            }
          }
        }
        return true;
      },

      // Adds a [list] of ids to our Slidr.
      add: function(ids, trans, valid, prev, next) {
        var current;
        for (var i = 0; current = ids[i]; i++) {
          slides.map[current] = slides.map[current] || {};
          var s = slides.get(current);
          s.target = valid[current];
          if (ids[i-1]) {
            s[prev] = ids[i-1];
            transition.set(current, prev, trans);
          }
          if (ids[i+1]) {
            s[next] = ids[i+1];
            transition.set(current, next, trans);
          }
          fx.init(current, trans);
          _.start = (!_.start) ? current : _.start;
        }
        if (_.started && !_.displayed) slides.display();
        return true;
      }
    };

    var size = {

      // Check whether width, height, and borderbox should by dynamically updated.
      dynamic: function() {
        var clone = _.slidr.cloneNode(false);
        var dummy = document.createElement('div');
        dummy.setAttribute('style', 'width: 42px; height: 42px;');
        clone.setAttribute('style', 'position: absolute; opacity: 0');
        clone.appendChild(dummy);
        _.slidr.parentNode.insertBefore(clone, _.slidr);
        var borderbox = css(clone, 'box-sizing') === 'border-box';
        var dynamic = {
          width: css(clone, 'width') - 42 === (borderbox ? size.widthPad() : 0),
          height: css(clone, 'height') - 42 === (borderbox ? size.heightPad() : 0),
          borderbox: borderbox
        };
        _.slidr.parentNode.removeChild(clone);
        return dynamic;
      },

      // Grabs the Slidr width/height padding.
      widthPad: function() {
        return css(_.slidr, 'padding-left') + css(_.slidr, 'padding-right');
      },
      heightPad: function() {
        return css(_.slidr, 'padding-top') + css(_.slidr, 'padding-bottom');
      },

      // Sets the width/height of our Slidr container.
      setWidth: function(w, borderbox) {
        css(_.slidr, { width: w + (borderbox ? size.widthPad() : 0) + 'px' }); return w;
      },
      setHeight: function(h, borderbox) {
        css(_.slidr, { height: h + (borderbox ? size.heightPad() : 0) + 'px' }); return h;
      },

      // Monitor our Slidr and auto resize if necessary.
      autoResize: function() {
        var h = 0;
        var w = 0;
        var d = size.dynamic();
        var timerId = setInterval((function watch() {
          if (!contains(document, _.slidr)) {
            clearInterval(timerId);
          } else if (css(_.slidr, 'visibility') === 'hidden') {
            h = size.setHeight(0, d.borderbox);
            w = size.setWidth(0, d.borderbox);
          } else if (slides.get(_.current)) {
            var target = slides.get(_.current).target;
            var height = css(target, 'height');
            var width = css(target, 'width');
            if (d.height && h != height) h = size.setHeight(height, d.borderbox);
            if (d.width && w != width) w = size.setWidth(width, d.borderbox);
          }
          return watch;
        })(), 250);
      }
    };

    var fx = {

      // CSS rules to apply to a slide on initialize.
      init: function(el, trans) {
        var init = lookup(_css, [trans, 'init']) || {};
        var s = slides.get(el);
        if (!s.initialized) {
          var display = css(s.target, 'display');
          extend(init, {
            'display': (display === 'none') ? 'block' : display,
            'visibility': 'visible',
            'position': 'absolute',
            'left': '50%',
            'margin-left': '-' + css(s.target, 'width')/2 + 'px',
            'opacity': '0',
            'z-index': '0',
            'pointer-events': 'none'
          });
          s.initialized = true;
        }
        css(s.target, init);
      },

      // Resolve keyframe animation name.
      name: function(trans, type, dir) {
        var parts = ['slidr', trans, type];
        if (trans !== 'fade') {
          parts.unshift(_.id);
          parts.push(dir);
        }
        return parts.join('-');
      },

      // Animate an `el` with `trans` effects coming [in|out] as `type` from direction `opt_dir`.
      animate: function(el, trans, type, opt_dir) {
        var anim = {
          'opacity': (type === 'in') ? '1': '0',
          'z-index': (type === 'in') ? '1': '0',
          'pointer-events': (type === 'in') ? 'auto': 'none'
        };
        var target = slides.get(el).target;
        if (lookup(_css, [trans, 'supported'])) {
          var timing = lookup(_css, [trans, 'timing']);
          if (timing) {
            var name = fx.name(trans, type, opt_dir);
            var keyframe = lookup(_css, [trans, type, opt_dir]);
            if (keyframe && opt_dir) {
              var size = css(target, (opt_dir === 'up' || opt_dir === 'down') ? 'height' : 'width');
              var opacity = _.settings['fading'] ? '0' : '1';
              keyframe(name, size, opacity);
            }
            anim['animation'] = timing(name);
          }
        }
        css(target, anim);
      },
    };

    var self = this;

    /**
     * Start the Slidr!
     * @param {string} opt_start slide to start on.
     */
    self.start = function(opt_start) {
      if (!_.started && _.slidr) {
        var display = css(_.slidr, 'display');
        var position = css(_.slidr, 'position');
        css(_.slidr, {
          'visibility': 'visible',
          'opacity': '1',
          'display': (display !== 'inline-block') ? 'table' : display,
          'position': (position === 'static') ? 'relative' : position
        });
        if (!_.start) self.add(_.settings['direction'], slides.find(true), _.settings['transition']);
        if (slides.get(opt_start)) _.start = opt_start;
        slides.display();
        size.autoResize();
        _.started = true;
      }
      return self;
    };

    /**
     * Available transitions.
     */
    self.transitions = function() {
      return transition.available.slice(0);
    };

    /**
     * Check whether we can slide.
     * @param {string} dir 'up', 'down', 'left' or 'right'.
     * @return {boolean}
     */
    self.canSlide = function(dir) {
      return _.started && !!slides.get(_.current, dir);
    };

    /**
     * Slide.
     * @param {string} dir slide 'up', 'down', 'left', or 'right'.
     */
    self.slide = function(dir) {
      return _.started && slides.slide(dir);
    };

    /**
     * Adds a set of slides.
     * @param {string} direction `horizontal` or `vertical`.
     * @param {Array} ids A list of `data-slidr` id's to add to Slidr. Slides must be children elements of the Slidr.
     * @param {string?} opt_transition The transition to apply between the slides. Defaults to settings.
     * @param {boolean?} opt_overwrite Whether to overwrite existing slide mappings/transitions if conflicts occur.
     */
    self.add = function(direction, ids, opt_transition, opt_overwrite) {
      if (_.slidr) {
        var trans = transition.validate(opt_transition);
        var valid = slides.find();
        var prev = (direction === 'horizontal' || direction === 'h') ? 'left' : 'up';
        var next = (direction === 'horizontal' || direction === 'h') ? 'right' : 'down';
        if (!slides.validate(ids, trans, valid, prev, next) && !opt_overwrite) {
          console.warn('[Slidr] Error adding [' + direction + '] slides.');
          return false;
        }
        return slides.add(ids, trans, valid, prev, next);
      }
    };


    /**
     * Helper functions for generating css keyframes.
     */
    var _cssHelper = {
      'cube': function(animation, rotateStart, rotateEnd, translateZ, opacityStart, opacityEnd) {
        _slidrCSS.createKeyframe(animation, {
          '0': { 'transform': 'rotate' + rotateStart + ' translateZ(' + translateZ + 'px)', 'opacity': opacityStart },
          '1': { 'transform': 'rotate' + rotateStart + ' translateZ(' + translateZ + 'px)', 'opacity': opacityStart },
          '100': { 'transform': 'rotate' + rotateEnd + ' translateZ(' + translateZ + 'px)', 'opacity': opacityEnd }
        });
      },
      'fade': function(animation, opacityStart, opacityEnd) {
        _slidrCSS.createKeyframe(animation, { '0': { 'opacity': opacityStart }, '100': { 'opacity': opacityEnd } });
      },
      'linear': function(animation, type, translateStart, translateEnd, opacityStart, opacityEnd) {
        _slidrCSS.createKeyframe(animation, {
          '0': { 'transform': 'translate' + (type === 'in') ? translateEnd : translateStart, 'opacity': opacityStart },
          '1': { 'transform': 'translate' + translateStart, 'opacity': opacityStart },
          '100': { 'transform': 'translate' + translateEnd, 'opacity': opacityEnd }
        });
      },
    };

    /**
     * Defines our available transitions.
     */
    var _css = {
      'none': {
        'supported': true
      },
      'fade': {
        'supported': _slidrCSS.supports('animation', 'opacity'),
        'init': (function() {
          _cssHelper['fade']('slidr-fade-in', '0', '1');
          _cssHelper['fade']('slidr-fade-out', '1', '0');
          return null; 
        })(),
        'timing': function(name) { return name + ' 0.4s ease-out 0s'; },
      },
      'linear': {
        'supported': _slidrCSS.supports('transform', 'opacity'),
        'timing': function(name) { return name + ' 0.6s ease-out 0s'; },
        'in': {
          'left': function(name, w, op) { _cssHelper['linear'](name, 'in', 'X(-' + w + 'px)', 'X(0px)', op, '1'); },
          'right': function(name, w, op) { _cssHelper['linear'](name, 'in', 'X(' + w + 'px)', 'X(0px)', op, '1'); },
          'up': function(name, h, op) { _cssHelper['linear'](name, 'in', 'Y(-' + h + 'px)', 'Y(0px)', op, '1'); },
          'down': function(name, h, op) { _cssHelper['linear'](name, 'in', 'Y(' + h + 'px)', 'Y(0px)', op, '1'); },
        },
        'out': {
          'left': function(name, w, op) { _cssHelper['linear'](name, 'out', 'X(0px)', 'X(' + w + 'px)', '1', op); },
          'right': function(name, w, op) { _cssHelper['linear'](name, 'out', 'X(0px)', 'X(-' + w + 'px)', '1', op); },
          'up': function(name, h, op) { _cssHelper['linear'](name, 'out', 'Y(0px)', 'Y(' + h + 'px)', '1', op); },
          'down': function(name, h, op) { _cssHelper['linear'](name, 'out', 'Y(0px)', 'Y(-' + h + 'px)', '1', op); },
        }
      },
      'cube': {
        'supported': _slidrCSS.supports('animation', 'backface-visibility', 'transform-style', 'transform', 'opacity'),
        'init': { 'backface-visibility': 'hidden', 'transform-style': 'preserve-3d' },
        'timing': function(name) { return name + ' 1s cubic-bezier(0.15, 0.9, 0.25, 1) 0s'; },
        'in': {
          'left': function(name, w, op) { _cssHelper['cube'](name, 'Y(-90deg)', 'Y(0deg)', w/2, op, '1'); },
          'right': function(name, w, op) { _cssHelper['cube'](name, 'Y(90deg)', 'Y(0deg)', w/2, op, '1'); },
          'up': function(name, h, op) { _cssHelper['cube'](name, 'X(90deg)', 'X(0deg)', h/2, op, '1'); },
          'down': function(name, h, op) { _cssHelper['cube'](name, 'X(-90deg)', 'X(0deg)', h/2, op, '1'); },
        },
        'out': {
          'left': function(name, w, op) { _cssHelper['cube'](name, 'Y(0deg)', 'Y(90deg)', w/2, '1', op); },
          'right': function(name, w, op) { _cssHelper['cube'](name, 'Y(0deg)', 'Y(-90deg)', w/2, '1', op); },
          'up': function(name, h, op) { _cssHelper['cube'](name, 'X(0deg)', 'X(-90deg)', h/2, '1', op); },
          'down': function(name, h, op) { _cssHelper['cube'](name, 'X(0deg)', 'X(90deg)', h/2, '1', op); },
        }
      },
    };
  };

  /**
   * Helper for creating Slidr CSS.
   */
  function SlidrCSS() {

    var self = this;

    /**
     * Resolves a css property name to the browser supported name, or null if not supported.
     */
    self.resolve = function(cssProperty, forCSS) {
      if (_propertyCache[cssProperty]) {
        return (forCSS) ? _propertyCache[cssProperty].css : _propertyCache[cssProperty].dom;
      }
      var result = _normalize(cssProperty);
      if (_style[result] !== undefined) {
        _propertyCache[cssProperty] = {
          css: cssProperty,
          dom: result
        };
        return (forCSS) ? cssProperty : result;
      }
      var prefix = _getDOMPrefix(cssProperty);
      if (!!prefix) {
        result = _normalize(cssProperty, prefix);
        if (_style[result] !== undefined) {
          _propertyCache[cssProperty] = {
            css: _cssPrefix + cssProperty,
            dom: result
          };
          return (forCSS) ?  _propertyCache[cssProperty].css : result;
        }
      }
      // Browser does not support this property.
      _propertyCache[cssProperty] = null;
      return null;
    };

    /**
     * Check whether all given css properties are supported in the browser.
     */
    self.supports = function(/* prop1, prop2... */) {
      var prop;
      for (var i = 0; prop = arguments[i]; i++) {
        if (!self.resolve(prop)) return false;
      }
      return true;
    };

    /**
     * Applies necessary CSS browser prefixes for a set of properties.
     */
    self.fixup = function(properties) {
      var result = {};
      for (var p in properties) {
        if (self.resolve(p)) {
          result[self.resolve(p)] = properties[p];
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
          rule.push(self.resolve(p, true) + ': ' + properties[p] + ';');
        }
        rule.push('}');
      }
      rule.push('}');
      rule = rule.join(' ');
      _addCSSRule(name, rule);
    };

    /**
     * Pointer to the document style sheets.
     */
    var _style = document.getElementsByTagName('html')[0]['style'];

    /**
     * Pointer to our Slidr CSS style sheet.
     */
    var _styleSheet = (function() {
      var style = document.createElement('style');
      style.type = 'text/css';
      document.head.appendChild(style);
      return style.sheet || style.styleSheet;
    }());

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
     * Adds a CSS rule to our Slidr stylesheet.
     */
    function _addCSSRule(name, rule) {
      var cssRule;
      for (var r = 0; cssRule = _styleSheet.cssRules[r]; r++) {
        if (cssRule.name == name) {
          _styleSheet.deleteRule(r);
          break;
        }
      }
      _styleSheet.insertRule(rule, _styleSheet.cssRules.length);
    }

    /**
     * Given a css property and a optional dom prefix, tranlate it into a DOM document representation.
     */
    function _normalize(prop, opt_domPrefix) {
      prop = prop.split('-');
      var p;
      for (var i = 0; p = prop[i]; i++) prop[i] = p[0].toUpperCase() + p.toLowerCase().slice(1);
      (!!opt_domPrefix) ? prop.unshift(opt_domPrefix) : prop[0] = prop[0].toLowerCase();
      return prop.join('');
    }

    /**
     * Given a css property, retrieves the DOM prefix if applicable.
     */
    function _getDOMPrefix(cssProperty) {
      if (_domPrefix === null && isString(cssProperty)) {
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
  };

  /**
   * Global API.
   */
  return {
    create: function(id, opt_settings) {
      var target = document.getElementById(id);
      if (!target) {
        console.warn('[Slidr] Could not find element with id: ' + id + '.');
        return;
      }
      return new Slidr(id, target, opt_settings);
    }
  };

}));

