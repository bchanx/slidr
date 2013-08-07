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

    // Add CSS keyframes.
    add: {
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
    }
  };

  var transition = {

    // Available transitions.
    available: ['cube', 'fade', 'linear', 'none'],

    // Validates a given transition.
    validate: function(_, trans) {
      trans = trans || _.settings['transition'];
      return (transition.available.indexOf(trans) < 0 || !fx.supported[trans]) ? 'none' : trans;
    },

    // Get the direction transition for an element.
    get: function(_, el, type, dir) {
      dir = (type === 'in') ? (dir === 'up') ? 'down' : (dir === 'down') ? 'up' :
        (dir === 'left') ? 'right' : 'left' : dir;
      return lookup(_.trans, [el, dir]);
    },

    // Sets the direction transition for an element.
    set: function(_, el, dir, trans) {
      trans = transition.validate(_, trans);
      if (!_.trans[el]) _.trans[el] = {};
      _.trans[el][dir] = trans;
      return trans;
    },

    // Applies a directional transition to an element entering/leaving the Slidr.
    apply: function(_, el, type, dir) {
      var trans = transition.get(_, el, type, dir);
      if (trans) fx.animate(_, el, trans, type, dir);
    }
  };

  var slides = {

    // Get slide metadata.
    get: function(_) {
      var args = [];
      for (var i = 1, a; a = arguments[i++]; args.push(a)) {};
      return lookup(_.slides, args);
    },

    // Display our starting slide.
    display: function(_) {
      if (!_.displayed && slides.get(_, _.start)) {
        _.current = _.start;
        fx.init(_, _.current, 'fade');
        fx.animate(_, _.current, 'fade', 'in');
        _.displayed = true;
      }
    },

    // Transition to the next slide in direction `dir`.
    slide: function(_, dir) {
      var next = slides.get(_, _.current, dir);
      if (_.current && next) {
        transition.apply(_, _.current, 'out', dir);
        _.current = next;
        transition.apply(_, next, 'in', dir);
        return true;
      }
      return false;
    },

    // Finds all valid slides (direct children with 'data-slidr' attributes).
    find: function(_, opt_asList) {
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
    validate: function(_, ids, trans, valid, prev, next) {
      if (!ids || ids.constructor !== Array) return false;
      // For each slide we're trying to add, check it against our known mapping.
      for (var i = 0, current, newPrev, newNext, oldPrev, oldNext, 
           prevPrev, oldPrevTrans, oldNextTrans; current = ids[i]; i++) {
        if (!(current in valid)) return false;
        if (slides.get(_, current)) {
          newPrev = ids[i-1] || null;
          newNext = ids[i+1] || null;
          oldPrev = slides.get(_, current, prev);
          oldNext = slides.get(_, current, next);
          prevPrev = slides.get(_, newNext, prev);
          oldPrevTrans = transition.get(_, current, 'out', prev);
          oldNextTrans = transition.get(_, current, 'out', next);
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
    add: function(_, ids, trans, valid, prev, next) {
      for (var i = 0, current; current = ids[i]; i++) {
        _.slides[current] = _.slides[current] || {};
        var s = slides.get(_, current);
        s.target = valid[current];
        if (ids[i-1]) {
          s[prev] = ids[i-1];
          transition.set(_, current, prev, trans);
        }
        if (ids[i+1]) {
          s[next] = ids[i+1];
          transition.set(_, current, next, trans);
        }
        fx.init(_, current, trans);
        _.start = (!_.start) ? current : _.start;
      }
      if (_.started && !_.displayed) slides.display(_);
      return true;
    }
  };

  var size = {

    // Check whether width, height, and borderbox should by dynamically updated.
    dynamic: function(_) {
      var clone = _.slidr.cloneNode(false);
      var probe = document.createElement('div');
      probe.setAttribute('style', 'width: 42px; height: 42px;');
      clone.setAttribute('style', 'position: absolute; opacity: 0');
      clone.appendChild(probe);
      _.slidr.parentNode.insertBefore(clone, _.slidr);
      var borderbox = css(clone, 'box-sizing') === 'border-box';
      var dynamic = {
        width: css(clone, 'width') - 42 === (borderbox ? size.widthPad(_) : 0),
        height: css(clone, 'height') - 42 === (borderbox ? size.heightPad(_) : 0),
        borderbox: borderbox
      };
      _.slidr.parentNode.removeChild(clone);
      return dynamic;
    },

    // Grabs the Slidr width/height padding.
    widthPad: function(_) {
      return css(_.slidr, 'padding-left') + css(_.slidr, 'padding-right');
    },
    heightPad: function(_) {
      return css(_.slidr, 'padding-top') + css(_.slidr, 'padding-bottom');
    },

    // Sets the width/height of our Slidr container.
    setWidth: function(_, w, borderbox) {
      css(_.slidr, { width: w + (borderbox ? size.widthPad(_) : 0) + 'px' }); return w;
    },
    setHeight: function(_, h, borderbox) {
      css(_.slidr, { height: h + (borderbox ? size.heightPad(_) : 0) + 'px' }); return h;
    },

    // Monitor our Slidr and auto resize if necessary.
    autoResize: function(_) {
      var h = 0;
      var w = 0;
      var d = size.dynamic(_);
      var timerId = setInterval((function watch() {
        if (!contains(document, _.slidr)) {
          clearInterval(timerId);
        } else if (css(_.slidr, 'visibility') === 'hidden') {
          h = size.setHeight(_, 0, d.borderbox);
          w = size.setWidth(_, 0, d.borderbox);
        } else if (slides.get(_, _.current)) {
          var target = slides.get(_, _.current).target;
          var height = css(target, 'height');
          var width = css(target, 'width');
          if (d.height && h != height) h = size.setHeight(_, height, d.borderbox);
          if (d.width && w != width) w = size.setWidth(_, width, d.borderbox);
        }
        return watch;
      })(), 250);
    }
  };

  var fx = {

    // CSS rules to apply to a slide on initialize.
    init: function(_, el, trans) {
      var init = lookup(fx.animation, [trans, 'init']) || {};
      var s = slides.get(_, el);
      if (!s.initialized) {
        var display = css(s.target, 'display');
        extend(init, {
          'display': (display === 'none') ? 'block' : display,
          'visibility': 'visible',
          'position': 'absolute',
          'opacity': '0',
          'z-index': '0',
          'pointer-events': 'none'
        });
        s.initialized = true;
      }
      css(s.target, init);
    },

    // Properties defining animation support.
    supported: {
      'none': true,
      'fade': browser.supports('animation', 'opacity'),
      'linear': browser.supports('transform', 'opacity'),
      'cube': browser.supports('animation', 'backface-visibility', 'transform-style', 'transform', 'opacity'),
    },

    // Timing functions for our animations.
    timing: {
      'none': function(name) { return 'none'; },
      'fade': function(name) { return name + ' 0.4s ease-out 0s'; },
      'linear': function(name) { return name + ' 0.6s ease-out 0s'; },
      'cube': function(name) { return name + ' 1s cubic-bezier(0.15, 0.9, 0.25, 1) 0s'; },
    },

    // Defines our slide animations.
    animation: {
      'fade': {
        'init': (function() {
          browser.add['fade']('slidr-fade-in', '0', '1');
          browser.add['fade']('slidr-fade-out', '1', '0');
          return null; 
        })(),
      },
      'linear': {
        'in': {
          'left': function(name, w, o) { browser.add['linear'](name, 'in', 'X(-' + w, 'X(0', o, '1'); },
          'right': function(name, w, o) { browser.add['linear'](name, 'in', 'X(' + w, 'X(0', o, '1'); },
          'up': function(name, h, o) { browser.add['linear'](name, 'in', 'Y(-' + h, 'Y(0', o, '1'); },
          'down': function(name, h, o) { browser.add['linear'](name, 'in', 'Y(' + h, 'Y(0', o, '1'); },
        },
        'out': {
          'left': function(name, w, o) { browser.add['linear'](name, 'out', 'X(0', 'X(' + w, '1', o); },
          'right': function(name, w, o) { browser.add['linear'](name, 'out', 'X(0', 'X(-' + w, '1', o); },
          'up': function(name, h, o) { browser.add['linear'](name, 'out', 'Y(0', 'Y(' + h, '1', o); },
          'down': function(name, h, o) { browser.add['linear'](name, 'out', 'Y(0', 'Y(-' + h, '1', o); },
        }
      },
      'cube': {
        'init': { 'backface-visibility': 'hidden', 'transform-style': 'preserve-3d' },
        'in': {
          'left': function(name, w, o) { browser.add['cube'](name, 'Y(-90', 'Y(0', w/2, o, '1'); },
          'right': function(name, w, o) { browser.add['cube'](name, 'Y(90', 'Y(0', w/2, o, '1'); },
          'up': function(name, h, o) { browser.add['cube'](name, 'X(90', 'X(0', h/2, o, '1'); },
          'down': function(name, h, o) { browser.add['cube'](name, 'X(-90', 'X(0', h/2, o, '1'); },
        },
        'out': {
          'left': function(name, w, o) { browser.add['cube'](name, 'Y(0', 'Y(90', w/2, '1', o); },
          'right': function(name, w, o) { browser.add['cube'](name, 'Y(0', 'Y(-90', w/2, '1', o); },
          'up': function(name, h, o) { browser.add['cube'](name, 'X(0', 'X(-90', h/2, '1', o); },
          'down': function(name, h, o) { browser.add['cube'](name, 'X(0', 'X(90', h/2, '1', o); },
        }
      },
    },

    // Resolve keyframe animation name.
    name: function(_, trans, type, dir) {
      var parts = ['slidr', trans, type];
      if (trans !== 'fade') {
        parts.unshift(_.id);
        parts.push(dir);
      }
      return parts.join('-');
    },

    // Animate an `el` with `trans` effects coming [in|out] as `type` from direction `opt_dir`.
    animate: function(_, el, trans, type, opt_dir) {
      var anim = {
        'opacity': (type === 'in') ? '1': '0',
        'z-index': (type === 'in') ? '1': '0',
        'pointer-events': (type === 'in') ? 'auto': 'none'
      };
      var target = slides.get(_, el).target;
      if (fx.supported[trans] && fx.timing[trans]) {
        var name = fx.name(_, trans, type, opt_dir);
        var keyframe = lookup(fx.animation, [trans, type, opt_dir]);
        if (keyframe && opt_dir) {
          var size = css(target, (opt_dir === 'up' || opt_dir === 'down') ? 'height' : 'width');
          var opacity = _.settings['fading'] ? '0' : '1';
          keyframe(name, size, opacity);
        }
        anim['animation'] = fx.timing[trans](name);
      }
      css(target, anim);
    },
  };

  var actions = {

    // Starts a Slidr.
    start: function(_, opt_start) {
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
        if (!_.start) actions.add(_, _.settings['direction'], slides.find(_, true), _.settings['transition']);
        if (slides.get(_, opt_start)) _.start = opt_start;
        slides.display(_);
        size.autoResize(_);
        _.started = true;
      }
      return this;
    },

    // Can we slide?
    canSlide: function(_, dir) {
      return _.started && !!slides.get(_, _.current, dir);
    },

    // Slide.
    slide: function(_, dir) {
      if (_.started) slides.slide(_, dir);
    },

    // Adds a set of slides.
    add: function(_, direction, ids, opt_transition, opt_overwrite) {
      if (_.slidr) {
        var trans = transition.validate(_, opt_transition);
        var valid = slides.find(_);
        var prev = (direction === 'horizontal' || direction === 'h') ? 'left' : 'up';
        var next = (direction === 'horizontal' || direction === 'h') ? 'right' : 'down';
        if (!slides.validate(_, ids, trans, valid, prev, next) && !opt_overwrite) {
          console.warn('[Slidr] Error adding [' + direction + '] slides.');
        } else {
          slides.add(_, ids, trans, valid, prev, next);
        }
      }
      return this;
    },

    // Automatically transition between slides.
    auto: function(_, dir, msec) {
      if (_.started) {
        actions.stop(_);
        _.auto = setInterval(function() { slides.slide(_, dir); }, msec);
      }
    },

    // Stops auto transitioning.
    stop: function(_) {
      if (_.started && _.auto) {
        clearInterval(_.auto);
        _.auto = null;
      }
    }
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
      current: null,

      // Whether auto() is currently active. Stores the timer interval id.
      auto: null,

      // A {mapping} of slides to their neighbors.
      slides: {},

      // A {mapping} of slides and their transition effects.
      trans: {},
    }

    var api = {

      /**
       * Start the Slidr! Automatically finds slides to create if nothing was added prior to calling start().
       * @param {string} opt_start `data-slidr` id to start on.
       * @return {this}
       */
      start: function(opt_start) {
        actions.start(_, opt_start);
        return this;
      },

      /**
       * Check whether we can slide.
       * @param {string} dir 'up', 'down', 'left' or 'right'.
       * @return {boolean}
       */
      canSlide: function(dir) {
        return actions.canSlide(_, dir);
      },

      /**
       * Slide.
       * @param {string} dir slide 'up', 'down', 'left', or 'right'.
       * @return {this}
       */
      slide: function(dir) {
        actions.slide(_, dir);
        return this;
      },

      /**
       * Adds a set of slides.
       * @param {string} direction `horizontal || h` or `vertical || v`.
       * @param {Array} ids A list of `data-slidr` id's to add to Slidr. Slides must be direct children of the Slidr.
       * @param {string?} opt_transition The transition to apply between the slides, or uses the default.
       * @param {boolean?} opt_overwrite Whether to overwrite existing slide mappings/transitions if conflicts occur.
       * @return {this}
       */
      add: function(direction, ids, opt_transition, opt_overwrite) {
        actions.add(_, direction, ids, opt_transition, opt_overwrite);
        return this;
      },

      /**
       * Automatically advance to the next slide after a certain timeout. Calls start() if not already called.
       * @param {string} direction 'up', 'down', 'left', or 'right'. Defaults to 'right'.
       * @param {int} msec The number of millis between each slide transition. Defaults to 5000 (5 seconds).
       * @param {string} opt_start The `data-slidr` id to start at (only works if auto was called to start the Slidr).
       */
      auto: function(direction, msec, opt_start) {
        actions.start(_, opt_start);
        actions.auto(_, direction || 'right', msec || 5000);
        return this;
      },

      /**
       * Stop auto transition if it's turned on.
       */
      stop: function() {
        actions.stop(_);
        return this;
      }
    };

    return api;
  };

  // Active Slidr instances.
  var INSTANCES = {};

  // Slidr default settings.
  var DEFAULTS = {
    'transition': 'none',
    'direction': 'horizontal',
    'fading': true,
    'clipping': false
  };

  // Global API.
  return {
    /**
     * Available transitions.
     * @return {Array} of transitions.
     */
    transitions: function() {
      return transition.available.slice(0);
    },

    /**
     * Creates a Slidr.
     * @param {string} id The element id to turn into a Slidr.
     * @param {Object} opt_settings Settings to apply.
     */
    create: function(id, opt_settings) {
      var target = document.getElementById(id);
      if (!target) {
        console.warn('[Slidr] Could not find element with id: ' + id + '.');
        return;
      }
      INSTANCES[id] = INSTANCES[id] || new Slidr(id, target, extend(DEFAULTS, opt_settings));
      return INSTANCES[id];
    }
  };

}));

