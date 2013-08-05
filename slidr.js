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
    for (var i = 1, arg; arg = arguments[i]; i++) for (var a in arg) obj[a] = arg[a];
    return obj;
  }

  // Check whether node a contains node b.
  function contains(a, b) {
    return (a.contains) ? a.contains(b) : a.compareDocumentPosition(b) & 16;
  }

  // If `prop` is a string, do a CSS lookup. Otherwise, add CSS styles to `el`.
  function css(el, prop) {
    if (typeof prop === 'string') {
      var style = window.getComputedStyle(el)[browser.vendor(prop)];
      return (style) ? (style.slice(-2) === 'px' && style.indexOf('px') == style.length - 2) ? 
        parseInt(style.slice(0, -2)) : style : 'none';
    }
    for (var p in prop) if (browser.vendor(p)) el.style[browser.vendor(p)] = prop[p];
    return el;
  }

  var browser = {

    // Vendor prefixes.
    prefixes: ['webkit', 'Moz', 'ms', 'O'],

    // CSS property cache.
    cache: {},

    // Reference to the document style element.
    styleEl: document.getElementsByTagName('html')[0]['style'],

    // Slidr CSS style sheet.
    styleSheet: (function() {
      var el = document.createElement('style');
      el.type = 'text/css';
      document.head.appendChild(el);
      return el.sheet || el.styleSheet;
    }()),

    // Adds a CSS rule to our Slidr stylesheet.
    addCSSRule: function(name, rule) {
      for (var r = 0, cssRule; cssRule = browser.styleSheet.cssRules[r]; r++) {
        if (cssRule.name == name) {
          browser.styleSheet.deleteRule(r);
          break;
        }
      }
      browser.styleSheet.insertRule(rule, browser.styleSheet.cssRules.length);
    },

    // Creates a keyframe animation rule.
    createKeyframe: function(name, rules) {
      var animation = browser.vendor('animation', true);
      if (animation) {
        var prefix = (/^-[a-z]+-/gi.test(animation)) ? /^-[a-z]+-/gi.exec(animation)[0] : '';
        var rule = ['@' + prefix + 'keyframes ' + name + ' {'];
        for (var r in rules) {
          rule.push(r + '% {');
          for (var p in rules[r]) rule.push(browser.vendor(p, true) + ': ' + rules[r][p] + ';');
          rule.push('}');
        }
        rule.push('}');
        browser.addCSSRule(name, rule.join(' '));
      }
    },

    // Returns the browser supported property name, or null.
    vendor: function(prop, forCSS) {
      if (!(prop in browser.cache)) {
        var parts = prop.split('-');
        for (var i = 0, p; p = parts[i]; i++) parts[i] = p[0].toUpperCase() + p.toLowerCase().slice(1);
        var domprop = parts.join('');
        domprop = domprop[0].toLowerCase() + domprop.slice(1);
        if (browser.styleEl[domprop] !== undefined) {
          browser.cache[prop] = { css: prop, dom: domprop };
        } else {
          domprop = parts.join('');
          for (i = 0; i < browser.prefixes.length; i++) {
            if (browser.styleEl[browser.prefixes[i] + domprop] !== undefined) {
              browser.cache[prop] = {
                css: '-' + browser.prefixes[i].toLowerCase() + '-' + prop, dom: browser.prefixes[i] + domprop
              };
            }
          }
        }
        if (!browser.cache[prop]) browser.cache[prop] = null;
      }
      return (browser.cache[prop] !== null) ? (forCSS) ? browser.cache[prop].css : browser.cache[prop].dom : null;
    },


    // Check whether all given css properties are supported in the browser.
    supports: function(/* prop1, prop2... */) {
      for (var i = 0, prop; prop = arguments[i]; i++) if (!browser.vendor(prop)) return false;
      return true;
    },

  };

  // Create CSS keyframes.
  var keyframe = {
    'fade': function(name, oStart, oEnd) {
      browser.createKeyframe(name, { '0': { 'opacity': oStart }, '100': { 'opacity': oEnd } });
    },
    'linear': function(name, type, tStart, tEnd, oStart, oEnd) {
      browser.createKeyframe(name, {
        '0': { 'transform': 'translate' + (type === 'in' ? tEnd : tStart) + 'px)',
          'opacity': (type === 'in' ? '0' : oStart) },
        '1': { 'transform': 'translate' + tStart + 'px)', 'opacity': (type === 'in' ? '0' : oStart) },
        '2': { 'transform': 'translate' + tStart + 'px)', 'opacity': oStart },
        '98': { 'transform': 'translate' + tEnd + 'px)', 'opacity': oEnd },
        '99': { 'transform': 'translate' + tEnd + 'px)', 'opacity': type === 'out' ? '0' : oEnd },
        '100': { 'transform': 'translate' + (type === 'out' ? tStart : tEnd) + 'px)' }
      });
    },
    'cube': function(name, rStart, rEnd, tZ, oStart, oEnd) {
      browser.createKeyframe(name, {
        '0': { 'transform': 'rotate' + rStart + 'deg) translateZ(' + tZ + 'px)', 'opacity': oStart },
        '100': { 'transform': 'rotate' + rEnd + 'deg) translateZ(' + tZ + 'px)', 'opacity': oEnd }
      });
    }
  };

  // Properties defining animation support.
  var supported = {
    'none': true,
    'fade': browser.supports('animation', 'opacity'),
    'linear': browser.supports('transform', 'opacity'),
    'cube': browser.supports('animation', 'backface-visibility', 'transform-style', 'transform', 'opacity'),
  };

  // Timing functions for our animations.
  var timing = {
    'none': function(name) { return 'none'; },
    'fade': function(name) { return name + ' 0.4s ease-out 0s'; },
    'linear': function(name) { return name + ' 0.6s ease-out 0s'; },
    'cube': function(name) { return name + ' 1s cubic-bezier(0.15, 0.9, 0.25, 1) 0s'; },
  };

  // Defines our slide animations.
  var animation = {
    'fade': {
      'init': (function() {
        keyframe['fade']('slidr-fade-in', '0', '1');
        keyframe['fade']('slidr-fade-out', '1', '0');
        return null; 
      })(),
    },
    'linear': {
      'in': {
        'left': function(name, w, o) { keyframe['linear'](name, 'in', 'X(-' + w, 'X(0', o, '1'); },
        'right': function(name, w, o) { keyframe['linear'](name, 'in', 'X(' + w, 'X(0', o, '1'); },
        'up': function(name, h, o) { keyframe['linear'](name, 'in', 'Y(-' + h, 'Y(0', o, '1'); },
        'down': function(name, h, o) { keyframe['linear'](name, 'in', 'Y(' + h, 'Y(0', o, '1'); },
      },
      'out': {
        'left': function(name, w, o) { keyframe['linear'](name, 'out', 'X(0', 'X(' + w, '1', o); },
        'right': function(name, w, o) { keyframe['linear'](name, 'out', 'X(0', 'X(-' + w, '1', o); },
        'up': function(name, h, o) { keyframe['linear'](name, 'out', 'Y(0', 'Y(' + h, '1', o); },
        'down': function(name, h, o) { keyframe['linear'](name, 'out', 'Y(0', 'Y(-' + h, '1', o); },
      }
    },
    'cube': {
      'init': { 'backface-visibility': 'hidden', 'transform-style': 'preserve-3d' },
      'in': {
        'left': function(name, w, o) { keyframe['cube'](name, 'Y(-90', 'Y(0', w/2, o, '1'); },
        'right': function(name, w, o) { keyframe['cube'](name, 'Y(90', 'Y(0', w/2, o, '1'); },
        'up': function(name, h, o) { keyframe['cube'](name, 'X(90', 'X(0', h/2, o, '1'); },
        'down': function(name, h, o) { keyframe['cube'](name, 'X(-90', 'X(0', h/2, o, '1'); },
      },
      'out': {
        'left': function(name, w, o) { keyframe['cube'](name, 'Y(0', 'Y(90', w/2, '1', o); },
        'right': function(name, w, o) { keyframe['cube'](name, 'Y(0', 'Y(-90', w/2, '1', o); },
        'up': function(name, h, o) { keyframe['cube'](name, 'X(0', 'X(-90', h/2, '1', o); },
        'down': function(name, h, o) { keyframe['cube'](name, 'X(0', 'X(90', h/2, '1', o); },
      }
    },
  };


  // The Slidr constructor.
  var Slidr = function(id, target, settings) {

    var _ = {
      // Slidr id.
      id: id,

      // Reference to the Slidr element.
      slidr: target,

      // Settings for this Slidr.
      settings: settings,

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
        return (transition.available.indexOf(trans) < 0 || !supported[trans]) ? 'none' : trans;
      },

      // Get the direction transition for an element.
      get: function(el, type, dir) {
        dir = (type === 'in') ? (dir === 'up') ? 'down' : (dir === 'down') ? 'up' :
          (dir === 'left') ? 'right' : 'left' : dir;
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
        for (var i = 0, slide, name; slide = _.slidr.childNodes[i]; i++) {
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
        // For each slide we're trying to add, check it against our known mapping.
        for (var i = 0, current, newPrev, newNext, oldPrev, oldNext, 
             prevPrev, oldPrevTrans, oldNextTrans; current = ids[i]; i++) {
          if (!(current in valid)) return false;
          if (slides.get(current)) {
            newPrev = ids[i-1] || null;
            newNext = ids[i+1] || null;
            oldPrev = slides.get(current, prev);
            oldNext = slides.get(current, next);
            prevPrev = slides.get(newNext, prev);
            oldPrevTrans = transition.get(current, 'out', prev);
            oldNextTrans = transition.get(current, 'out', next);
            // Are we about to override an existing mapping?
            if ((oldNext && newNext && oldNext != newNext)
              || (oldPrev && newPrev && oldPrev != newPrev)
              || (prevPrev && prevPrev != current)
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
        for (var i = 0, current; current = ids[i]; i++) {
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
        var probe = document.createElement('div');
        probe.setAttribute('style', 'width: 42px; height: 42px;');
        clone.setAttribute('style', 'position: absolute; opacity: 0');
        clone.appendChild(probe);
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
        var init = lookup(animation, [trans, 'init']) || {};
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
        if (supported[trans] && timing[trans]) {
          var name = fx.name(trans, type, opt_dir);
          var keyframe = lookup(animation, [trans, type, opt_dir]);
          if (keyframe && opt_dir) {
            var size = css(target, (opt_dir === 'up' || opt_dir === 'down') ? 'height' : 'width');
            var opacity = _.settings['fading'] ? '0' : '1';
            keyframe(name, size, opacity);
          }
          anim['animation'] = timing[trans](name);
        }
        css(target, anim);
      },
    };

    var api = {

      /**
       * Start the Slidr! Automatically finds slides to create if nothing was added prior to calling start().
       * @param {string} opt_start `data-slidr` id to start on.
       * @return {this}
       */
      start: function(opt_start) {
        if (!_.started && _.slidr) {
          var display = css(_.slidr, 'display');
          var position = css(_.slidr, 'position');
          var overflow = css(_.slidr, 'overflow');
          css(_.slidr, {
            'visibility': 'visible',
            'opacity': '1',
            'display': (display !== 'inline-block') ? 'table' : display,
            'position': (position === 'static') ? 'relative' : position,
            'overflow': (_.settings['clipping']) ? 'hidden': overflow
          });
          if (!_.start) api.add(_.settings['direction'], slides.find(true), _.settings['transition']);
          if (slides.get(opt_start)) _.start = opt_start;
          slides.display();
          size.autoResize();
          _.started = true;
        }
        return this;
      },

      /**
       * Available transitions.
       * @return {Array} of transitions.
       */
      transitions: function() {
        return transition.available.slice(0);
      },

      /**
       * Check whether we can slide.
       * @param {string} dir 'up', 'down', 'left' or 'right'.
       * @return {boolean}
       */
      canSlide: function(dir) {
        return _.started && !!slides.get(_.current, dir);
      },

      /**
       * Slide.
       * @param {string} dir slide 'up', 'down', 'left', or 'right'.
       * @return {this}
       */
      slide: function(dir) {
        if (_.started) slides.slide(dir);
        return this;
      },

      /**
       * Adds a set of slides.
       * @param {string} direction `horizontal || h` or `vertical || v`.
       * @param {Array} ids A list of `data-slidr` id's to add to Slidr. Slides must be children elements of the Slidr.
       * @param {string?} opt_transition The transition to apply between the slides. Defaults to settings.
       * @param {boolean?} opt_overwrite Whether to overwrite existing slide mappings/transitions if conflicts occur.
       * @return {this}
       */
      add: function(direction, ids, opt_transition, opt_overwrite) {
        if (_.slidr) {
          var trans = transition.validate(opt_transition);
          var valid = slides.find();
          var prev = (direction === 'horizontal' || direction === 'h') ? 'left' : 'up';
          var next = (direction === 'horizontal' || direction === 'h') ? 'right' : 'down';
          if (!slides.validate(ids, trans, valid, prev, next) && !opt_overwrite) {
            console.warn('[Slidr] Error adding [' + direction + '] slides.');
          } else {
            slides.add(ids, trans, valid, prev, next);
          }
        }
        return this;
      },
    };

    return api;
  };

  // Slidr default settings.
  var defaults = {
    'transition': 'none',
    'direction': 'horizontal',
    'fading': true,
    'clipping': false
  };

  // Global API.
  return {
    create: function(id, opt_settings) {
      var target = document.getElementById(id);
      if (!target) {
        console.warn('[Slidr] Could not find element with id: ' + id + '.');
        return;
      }
      return new Slidr(id, target, extend(defaults, opt_settings));
    }
  };

}));

