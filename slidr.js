/*!
 * slidr v0.5.0 - A Javascript library for adding slide effects.
 * bchanx.com/slidr
 * MIT licensed
 *
 * Copyright (c) 2014 Brian Chan (bchanx.com)
 */
(function(root, factory) {
  // CommonJS
  if (typeof exports === 'object') module['exports'] = factory();

  // AMD module
  else if (typeof define === 'function' && define['amd']) define(factory);

  // Browser globals
  else root['slidr'] = factory();

} (this, function() {
  'use strict';

  // Traverse [keys] in {object} to lookup a value, or null if nothing found.
  function lookup(obj, keys) {
    var result = obj;
    for (var k in keys) {
      if (!result || !result.hasOwnProperty(keys[k])) return null;
      result = result[keys[k]];
    }
    return (result === obj) ? null : result;
  }

  // Merge all properties from {arguments} and return the new {object}.
  function extend(/* arg1, arg2.. */) {
    var newobj = {};
    for (var i = 0, arg; arg = arguments[i]; i++) for (var a in arg) newobj[a] = arg[a];
    return newobj;
  }

  // Check whether node a contains node b.
  function contains(a, b) {
    return (a.contains) ? a.contains(b) : (a.compareDocumentPosition) ? a.compareDocumentPosition(b) & 16 : 0;
  }

  // Returns the tag name, normalized.
  function tagName(el) {
    return (el.tagName) ? el.tagName.toLowerCase() : null;
  }

  // Simple indexOf polyfill for IE8.
  function indexOf(list, val) {
    if (Array.prototype.indexOf) return list.indexOf(val);
    for (var i = 0, len = list.length; i < len; i++) if (list[i] === val) return i;
    return -1;
  }
  
  // Simple trim polyfill for IE8.
  function trim(str) {
    return ("".trim) ? str.trim() : str.replace(/^\s+|\s+$/g, '');
  }

  // Creates a document element, and sets any properties passed in.
  function createEl(tag, props) {
    var el = document.createElement(tag);
    for (var p in props) el[p] = props[p];
    return el;
  }

  // Add/rm class(es) on an element.
  function classname(el, type /* class1, class2... */) {
    var clsnames = trim(el.className);
    clsnames = (clsnames) ? clsnames.split(/\s+/) : [];
    for (var a = 2, cls, idx; cls = arguments[a]; a++) {
      idx = indexOf(clsnames, cls);
      if (type === 'add' && idx < 0) clsnames.push(cls);
      if (type === 'rm' && idx >= 0) clsnames.splice(idx, 1);
    }
    el.className = clsnames.join(' ');
    return el;
  }

  // Normalize a string. Strip spaces, single, and double quotes then return in alphabetical order.
  function normalize(str) {
    return str.replace(/[\s'"]/gi, '').split('').sort().join('');
  }

  // Set name:value attribute for an element.
  function setattr(el, name, value) {
    if (el && el.setAttribute) el.setAttribute(name, value);
    return el;
  }

  // Get attribute from an element.
  function getattr(el, name) {
    return (el && el.getAttribute) ? el.getAttribute(name) : null;
  }

  // If `prop` is a string, do a CSS lookup. Otherwise, add CSS styles to `el`.
  function css(el, prop) {
    if (typeof prop === 'string') {
      var view = (document.defaultView) ? document.defaultView.getComputedStyle(el) : el.currentStyle;
      var style = view[browser.fix(prop)];
      if (!style && prop === 'opacity') style = (view.filter) ? view.filter.split('=')[1].replace(')', '') : '1';
      if (style) {
        var val = style.slice(0, -2);
        return (style.slice(-2) === 'px' && !isNaN(parseInt(val)) && val.search('px') <= 0) ? parseInt(val) : style;
      }
      return 'none';
    }
    for (var p in prop) if (browser.fix(p)) el.style[browser.fix(p)] = prop[p];
    return el;
  }

  // Bind element event(s) to a callback.
  function bind(el, ev, callback, optUnbind) {
    if (typeof(ev) === 'string') ev = [ev];
    for (var i = 0, e, isAnimation; e = ev[i]; i++) {
      isAnimation = indexOf(browser.animations, e) > 0;
      e = (e === 'click' && 'ontouchstart' in window) ? 'touchend' : 
        (el.attachEvent && !isAnimation) ? 'on' + e : e;
      (el.attachEvent && !isAnimation) ? (optUnbind ? el.detachEvent(e, callback) : el.attachEvent(e, callback)) :
        (optUnbind ? el.removeEventListener(e, callback) : el.addEventListener(e, callback));
    }
  }

  // Unbind element event(s) to a callback.
  function unbind(el, ev, callback) {
    bind(el, ev, callback, true);
  }

  // Check whether element has border-box set.
  function borderbox(el) {
    return css(el, 'box-sizing') === 'border-box';
  }

  var browser = {

    // Vendor prefixes.
    prefixes: ['webkit', 'Moz', 'ms', 'O'],

    // CSS property cache.
    cache: {},

    // CSS keyframe cache.
    keyframes: {},

    // Flag for IE < 8.
    isIE: function() {
      if (browser.supports('filter') && !browser.supports('opacity')) browser.isIE = function() { return true; };
      else browser.isIE = function() { return false; };
      return browser.isIE();
    },

    // Reference to the document style element.
    styleEl: document.getElementsByTagName('html')[0]['style'],

    // Slidr CSS style sheet.
    styleSheet: (function() {
      var el = createEl('style', { 'type' : 'text/css' });
      document.getElementsByTagName('head')[0].appendChild(el);
      return el.sheet || el.styleSheet;
    }()),

    // Get browser specific stylesheet rules.
    cssRules: function() {
      browser.cssRules = function() { return browser.styleSheet.cssRules || browser.styleSheet.rules; };
      return browser.cssRules();
    },

    // Use browser specific insert for stylesheets.
    insertRule: function(rule) {
      if (browser.styleSheet.insertRule) {
        browser.insertRule = function(r) { browser.styleSheet.insertRule(r, browser.cssRules().length); };
      } else {
        browser.insertRule = function(r) {
          var split = r.split(' {');
          if (split.length === 2) {
            var left = split[0];
            var right = trim(split[1].replace(/;?\s?}$/g, ''));
            if (left && right) browser.styleSheet.addRule(left, right);
          }
        }
      }
      browser.insertRule(rule);
    },

    // Adds a CSS rule to our Slidr stylesheet.
    addCSSRule: function(name, rule, optSafe) {
      name = normalize(name);
      for (var r = 0, cssRule, cssName; cssRule = browser.cssRules()[r]; r++) {
        cssName = normalize((cssRule.name || cssRule.selectorText || cssRule.cssText.split(' {')[0] || ''));
        if (cssName === name) {
          if (!!optSafe || (normalize(cssRule.cssText) === normalize(rule))) return;
          browser.styleSheet.deleteRule(r);
          break;
        }
      }
      browser.insertRule(rule);
    },

    // Creates a CSS rule.
    createRule: function(name, props) {
      var rule = [name, '{'];
      for (var p in props) if (browser.fix(p, true)) rule.push(browser.fix(p, true) + ':' + props[p] + ';');
      rule.push('}');
      return rule.join(' ');
    },

    // Creates a CSS style.
    createStyle: function(name, props, optSafe) {
      browser.addCSSRule(name, browser.createRule(name, props), optSafe);
    },

    // Get browser prefix.
    prefix: function(prop) {
      return (prop.split('-').length === 3) ? '-' + prop.split('-')[1] + '-' : '';
    },

    // Creates a keyframe animation rule.
    createKeyframe: function(name, rules) {
      var animation = browser.fix('animation', true);
      if (animation && !browser.keyframes[name]) {
        var rule = ['@' + browser.prefix(animation) + 'keyframes ' + name + ' {'];
        for (var r in rules) rule.push(browser.createRule(r + '%', rules[r]));
        rule.push('}');
        browser.addCSSRule(name, rule.join(' '));
        browser.keyframes[name] = true;
      }
    },

    // Returns the browser supported property name, or null.
    fix: function(prop, forCSS) {
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
      for (var i = 0, prop; prop = arguments[i]; i++) if (!browser.fix(prop)) return false;
      return true;
    },

    // Add CSS keyframes.
    add: {
      'fade': function(name, oStart, oEnd) {
        browser.createKeyframe(name, {
          '0': { 'opacity': oStart, 'visibility': 'visible' }, '100': { 'opacity': oEnd, 'visibility': 'hidden' }
        });
      },
      'linear': function(name, type, tStart, tEnd, oStart, oEnd) {
        browser.createKeyframe(name, {
          '0': { 'transform': 'translate' + tStart[0] + '(0%)',
            'opacity': (type === 'in' ? '0': oStart), 'visibility': 'visible' },
          '1': { 'transform': 'translate' + tStart + 'px)', 'opacity': oStart },
          '99': { 'transform': 'translate' + tEnd + 'px)', 'opacity': oEnd },
          '100': { 'transform': 'translate' + tEnd[0] + '(0%)',
            'opacity': (type === 'out' ? '0' : oEnd), 'visibility': 'hidden' }
        });
      },
      'cube': function(name, rStart, rEnd, tZ, oStart, oEnd) {
        browser.createKeyframe(name, {
          '0': { 'transform': 'rotate' + rStart + '0deg) translateZ(' + tZ + 'px)', 'opacity': oStart,
            'visibility': 'visible' },
          '100': { 'transform': 'rotate' + rEnd + '0deg) translateZ(' + tZ + 'px)', 'opacity': oEnd,
            'visibility': 'hidden' }
        });
      }
    },

    // CSS classnames for breadcrumbs/controls.
    classnames: function(cls) {
      return {
        main: cls,
        maincss: 'aside[id*="-' + cls + '"]',
        nav: 'slidr-' + cls,
        navcss: 'aside[id*="-' + cls + '"] .slidr-' + cls,
        data: 'data-slidr-' + cls,
        id: function(_, css) { return css ? 'aside[id="' + _.id + '-' + cls + '"]' : _.id + '-' + cls; }
      }
    },

    // Sanitize events for IE.
    sanitize: function(e) {
      e = e || window.event;
      if (!e.target) e.target = e.srcElement;
      if (!e.currentTarget) e.currentTarget = e.srcElement;
      if (!e.which && e.keyCode) e.which = e.keyCode;
      return e;
    },

    // Stop event propagation.
    stop: function(e) {
      e = e || window.event;
      e.cancelBubble = true;
      e.returnValue = false;
      if (e.stopPropagation) e.stopPropagation();
      if (e.preventDefault) e.preventDefault();
      return false;
    },

    // Animationend events.
    animations:  ['animationend', 'webkitAnimationEnd', 'oanimationend', 'MSAnimationEnd']
  };

  var transition = {

    // Available transitions.
    available: ['cube', 'fade', 'linear', 'none'],

    // Validates a given transition.
    validate: function(_, trans) {
      trans = trans || _.settings['transition'];
      return (indexOf(transition.available, trans) < 0 || !fx.supported[trans]) ? 'none' : trans;
    },

    // Get the direction transition for an element.
    get: function(_, el, type, dir) {
      return lookup(_.trans, [el, (type === 'in') ? slides.opposite(dir) : dir]);
    },

    // Sets the direction transition for an element.
    set: function(_, el, dir, trans) {
      trans = transition.validate(_, trans);
      if (!_.trans[el]) _.trans[el] = {};
      _.trans[el][dir] = trans;
      return trans;
    },

    // Applies a directional transition to an element entering/leaving the Slidr.
    apply: function(_, el, type, dir, trans) {
      breadcrumbs.update(_, el, type);
      fx.animate(_, el, trans, type, dir);
    }
  };

  var callback = {

    // Cache before/after hashes to prevent duplicate calls.
    cache: {},

    // Generate a unique hash string per metadata.
    hash: function(meta) {
      return [meta['id'], meta['in']['slidr'], meta['in']['trans'], meta['in']['dir'], meta['out']['slidr'],
        meta['out']['trans'], meta['out']['dir']].join('-');
    },

    // Generate callback metadata.
    meta: function(_, outs, ins, outdir, indir, outtrans, intrans) {
      return {
        'id': _.id,
        'in': { 'el': slides.get(_, ins).el, 'slidr': ins, 'trans': intrans, 'dir': indir },
        'out': { 'el': slides.get(_, outs).el, 'slidr': outs, 'trans': outtrans, 'dir': slides.opposite(outdir) }
      };
    },

    // Callback before a Slidr transition.
    before: function(_, meta) {
      var hash = callback.hash(meta);
      if (!callback.cache[hash]) callback.cache[hash] = {};
      if (!callback.cache[hash].before) {
        callback.cache[hash].before = true;
        var cb = _.settings['before'];
        if (typeof cb === 'function') cb(meta);
      }
    },

    // Callback after a Slidr animation.
    after: function(_, meta) {
      var hash = callback.hash(meta);
      if (!callback.cache[hash].after) {
        callback.cache[hash].after = true;
        var cb = _.settings['after'];
        if (typeof cb === 'function') callback.bindonce(cb, meta);
      }
    },

    // Bind after callback once.
    bindonce: function(cb, meta) {
      if (browser.supports('animation') && meta['in']['trans'] !== 'none') {
        var newCallback = function(e) {
          if (browser.keyframes[e.animationName]) {
            cb(meta);
            unbind(meta['in']['el'], browser.animations, newCallback);
            callback.reset(meta);
          }
        };
        bind(meta['in']['el'], browser.animations, newCallback);
      } else {
        cb(meta);
        callback.reset(meta);
      }
    },

    // Reset animation cache.
    reset: function(meta) {
      var hash = callback.hash(meta);
      callback.cache[hash].before = false;
      callback.cache[hash].after = false;
    }
  };

  var slides = {

    // Possible directions.
    directions: ['left', 'up', 'top', 'right', 'down', 'bottom'],

    // Check if next is a direction.
    isdir: function(next) {
      return indexOf(slides.directions, next) >= 0;
    },

    // Get the opoosite direction.
    opposite: function(dir) {
      var length = slides.directions.length;
      return slides.isdir(dir) ? slides.directions[(indexOf(slides.directions, dir) + length/2) % length] : null;
    },

    // Get slide metadata.
    get: function(_) {
      var args = [];
      for (var i = 1, a; (a = arguments[i++]) !== undefined; args.push(a)) {};
      return lookup(_.slides, args);
    },

    // Display our starting slide.
    display: function(_) {
      if (!_.displayed && slides.get(_, _.start)) {
        _.current = _.start;
        breadcrumbs.create(_);
        controls.create(_);
        fx.init(_, _.current, 'fade');
        fx.animate(_, _.current, 'fade', 'in');
        _.displayed = true;
        actions.controls(_, _.settings['controls']);
        if (!!_.settings['breadcrumbs']) actions.breadcrumbs(_);
      }
    },

    // Transition to the next slide.
    slide: function(_, next) {
      return slides.isdir(next) ? slides.go(_, slides.get(_, _.current, next), next, next) : slides.jump(_, next);
    },

    // Jump to a target slide.
    jump: function(_, el) {
      if (el && el !== _.current && slides.get(_, el)) {
        var cur = _.crumbs[_.current];
        var next = _.crumbs[el];
        var hdir = (cur.x < next.x) ? 'right' : (cur.x > next.x) ? 'left' : null;
        var vdir = (cur.y < next.y) ? 'up': (cur.y > next.y) ? 'down': null;
        var outdir = (transition.get(_, _.current, 'out', hdir)) ? hdir :
                     (transition.get(_, _.current, 'out', vdir)) ? vdir : null;
        var indir = (transition.get(_, el, 'in', hdir)) ? hdir :
                    (transition.get(_, el, 'in', vdir)) ? vdir : null;
        slides.go(_, el, outdir, indir, (outdir) ? null : 'fade', (indir) ? null : 'fade');
      }
    },

    // Go to a target slide.
    go: function(_, el, outdir, indir, opt_outtrans, opt_intrans) {
      if (_.current && el) {
        var intrans = opt_intrans || transition.get(_, el, 'in', indir);
        var outtrans = opt_outtrans || transition.get(_, _.current, 'out', outdir);
        var meta = callback.meta(_, _.current, el, outdir, indir, outtrans, intrans);
        callback.before(_, meta);
        transition.apply(_, el, 'in', indir, intrans);
        transition.apply(_, _.current, 'out', outdir, outtrans);
        callback.after(_, meta);
        _.current = el;
        controls.update(_);
        return true;
      }
      return false;
    },

    // Finds all valid slides (direct children with 'data-slidr' attributes).
    find: function(_, opt_asList) {
      var valid = (opt_asList) ? [] : {};
      for (var i = 0, slide, name; slide = _.slidr.childNodes[i]; i++) {
        name = getattr(slide, 'data-slidr');
        if (name) {
          if (opt_asList && indexOf(valid, name) < 0) valid.push(name);
          else if (!(name in valid)) valid[name] = slide;
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
        s.el = valid[current];
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
      if (_.started) (!_.displayed) ? slides.display(_) : breadcrumbs.create(_);
      return true;
    }
  };

  var controls = {

    // Classnames
    cls: browser.classnames('control'),

    // Available control types.
    types: ['border', 'corner', 'none'],

    // Whether it's a valid control type.
    valid: function(ctrl) {
      return indexOf(controls.types, ctrl) >= 0;
    },

    // Create controls container.
    create: function(_) {
      if (_.slidr && !_.controls) {
        _.controls = css(classname(createEl('aside', { 'id': controls.cls.id(_) }), 'add', 'disabled'), {
          'opacity': '0',
          'filter': 'alpha(opacity=0)',
          'z-index': '0',
          'visibility': 'hidden',
          'pointer-events': 'none'
        });
        for (var n in _.nav) {
          _.nav[n] = setattr(classname(createEl('div'), 'add', controls.cls.nav, n), controls.cls.data, n);
          _.controls.appendChild(_.nav[n]);
        }
        controls.css(_);
        _.slidr.appendChild(_.controls);
        bind(_.controls, 'click', controls.onclick(_));
      }
    },

    // Controls CSS rules.
    css: function(_) {
      browser.createStyle(controls.cls.maincss, {
        'position': 'absolute',
        'bottom': css(_.slidr, 'padding-bottom') + 'px',
        'right': css(_.slidr, 'padding-right') + 'px',
        'padding': '10px',
        'box-sizing': 'border-box',
        'width': '75px',
        'height': '75px',
        'transform': 'translateZ(9998px)'
      }, true);
      browser.createStyle(controls.cls.maincss + '.disabled', {
        'transform': 'translateZ(0px) !important'
      }, true);
      browser.createStyle(controls.cls.maincss + '.breadcrumbs', {
        'left': css(_.slidr, 'padding-left') + 'px',
        'right': 'auto'
      }, true);
      browser.createStyle(controls.cls.maincss + '.border', {
        'bottom': '0',
        'right': '0',
        'left': '0',
        'width': '100%',
        'height': '100%'
      }, true);
      browser.createStyle(controls.cls.navcss, {
        'position': 'absolute',
        'pointer-events': 'auto',
        'cursor': 'pointer',
        'transition': 'opacity 0.2s linear'
      }, true);
      var disabled = {
        'opacity': '0.05',
        'cursor': 'auto'
      };
      if (browser.isIE()) disabled['display'] = 'none';
      browser.createStyle(controls.cls.navcss + '.disabled', disabled, true);

      var n, horizontal, pos, dir, ctrl, after, border, borderpad;
      for (n in _.nav) {
        horizontal = (n === 'left' || n === 'right');
        pos = (n === 'up') ? 'top' : (n === 'down') ? 'bottom' : n;
        dir = horizontal ? 'top' : 'left';

        ctrl = {
          'width': horizontal ? '22px': '16px',
          'height': horizontal ? '16px' : '22px',
          'tap-highlight-color': 'rgba(0, 0, 0, 0)',
          'touch-callout': 'none',
          'user-select': 'none'
        };
        ctrl[pos] = '0';
        ctrl[dir] = '50%';
        ctrl['margin-' + dir] = '-8px';
        browser.createStyle(controls.cls.navcss + '.' + n, ctrl, true);

        after = {
          'width': '0',
          'height': '0',
          'content': '""',
          'position': 'absolute',
          'border': '8px solid transparent'
        };
        after['border-' + slides.opposite(pos) + '-width'] = '12px';
        after['border-' + pos + '-width'] = '10px';
        after['border-' + slides.opposite(pos) + '-color'] = _.settings['theme'];
        after[pos] = '0';
        after[dir] = '50%';
        after['margin-' + dir] = '-8px';
        browser.createStyle(controls.cls.id(_, true) + ' .' + controls.cls.nav + '.' + n + ':after', after, true);

        border = {};
        border[horizontal ? 'height': 'width'] = '100%';
        border[dir] = '0';
        border['margin-' + dir] = '0';
        browser.createStyle(controls.cls.maincss + '.border .' + controls.cls.nav + '.' + n, border, true);

        borderpad = {};
        borderpad[pos] = css(_.slidr, 'padding-' + pos) + 'px';
        browser.createStyle(controls.cls.id(_, true) + '.border .' + controls.cls.nav + '.' + n, borderpad, true);
      }
    },

    // On click callback.
    onclick: function(_) {
      return function handler(e) { actions.slide(_, getattr(browser.sanitize(e).target, controls.cls.data)); };
    },

    // Update controls.
    update: function(_) {
      for (var n in _.nav) classname(_.nav[n], actions.canSlide(_, n) ? 'rm' : 'add', 'disabled');
    }
  };

  var breadcrumbs = {
  
    // Classnames
    cls: browser.classnames('breadcrumbs'),

    // Initialize breadcrumbs container.
    init: function(_) {
      if (_.slidr && !_.breadcrumbs) {
        _.breadcrumbs = css(classname(createEl('aside', { 'id': breadcrumbs.cls.id(_) }), 'add', 'disabled'), {
          'opacity': '0',
          'filter': 'alpha(opacity=0)',
          'z-index': '0',
          'pointer-events': 'none',
          'visibility': 'hidden'
        });
        breadcrumbs.css(_);
        _.slidr.appendChild(_.breadcrumbs);
        bind(_.breadcrumbs, 'click', breadcrumbs.onclick(_));
      }
    },

    // Breadcrumbs CSS rules.
    css: function(_) {
      browser.createStyle(breadcrumbs.cls.maincss, {
        'position': 'absolute',
        'bottom': css(_.slidr, 'padding-bottom') + 'px',
        'right': css(_.slidr, 'padding-right') + 'px',
        'padding': '10px',
        'box-sizing': 'border-box',
        'transform': 'translateZ(9999px)'
      }, true);
      browser.createStyle(breadcrumbs.cls.maincss + '.disabled', {
        'transform': 'translateZ(0px) !important'
      }, true);
      browser.createStyle(breadcrumbs.cls.navcss, {
        'padding': '0',
        'font-size': '0',
        'line-height': '0'
      }, true);
      browser.createStyle(breadcrumbs.cls.navcss + ' li', {
        'width': '10px',
        'height': '10px',
        'display': 'inline-block',
        'margin': '3px',
        'tap-highlight-color': 'rgba(0, 0, 0, 0)',
        'touch-callout': 'none',
        'user-select': 'none'
      }, true);
      browser.createStyle(breadcrumbs.cls.id(_, true) + ' .' + breadcrumbs.cls.nav + ' li.normal', {
        'border-radius': '100%',
        'border': '1px ' + _.settings['theme'] +' solid',
        'cursor': 'pointer',
        'pointer-events': 'auto'
      }, true);
      browser.createStyle(breadcrumbs.cls.id(_, true) + ' .' + breadcrumbs.cls.nav + ' li.active', {
        'width': '12px',
        'height': '12px',
        'margin': '2px',
        'background-color': _.settings['theme']
      }, true);
    },

    // On click callback.
    onclick: function(_) {
      return function handler(e) { actions.slide(_, getattr(browser.sanitize(e).target, breadcrumbs.cls.data)); };
    },

    // Breadcrumb offsets.
    offsets: {
      'right': { x: 1, y: 0 },
      'up': { x: 0, y: 1 },
      'left': { x: -1, y: 0 },
      'down': { x: 0, y: -1 }
    },

    // Find breadcrumbs.
    find: function(_, crumbs, bounds, el, x, y) {
      if (el) {
        if (!crumbs[el]) {
          crumbs[el] = { x: x, y: y };
          if (x < bounds.x.min) bounds.x.min = x;
          if (x > bounds.x.max) bounds.x.max = x;
          if (y < bounds.y.min) bounds.y.min = y;
          if (y > bounds.y.max) bounds.y.max = y;
        }
        el = slides.get(_, el);
        for (var o in breadcrumbs.offsets) {
          if (el[o] && !crumbs[el[o]]) {
            breadcrumbs.find(_, crumbs, bounds, el[o], x + breadcrumbs.offsets[o].x, y + breadcrumbs.offsets[o].y);
          }
        }
      }
    },

    // Update breadcrumbs.
    update: function(_, el, type) {
      classname(_.crumbs[el].el, type === 'in' ? 'add' : 'rm', 'active');
    },

    // Create breadcrumbs.
    create: function(_) {
      breadcrumbs.init(_);
      if (_.breadcrumbs) {
        var crumbs = {};
        var bounds = { x: { min: 0, max: 0 }, y: { min: 0, max: 0 } };
        breadcrumbs.find(_, crumbs, bounds, _.start, 0, 0);
        bounds.x.modifier = 0 - bounds.x.min;
        bounds.y.modifier = 0 - bounds.y.min;
        var crumbsMap = {};
        for (var el in crumbs) {
          crumbs[el].x += bounds.x.modifier;
          crumbs[el].y += bounds.y.modifier;
          crumbsMap[crumbs[el].x + ',' + crumbs[el].y] = el;
        }
        var rows = bounds.y.max - bounds.y.min + 1;
        var columns = bounds.x.max - bounds.x.min + 1;
        while (_.breadcrumbs.firstChild) _.breadcrumbs.removeChild(_.breadcrumbs.firstChild);
        var ul = classname(createEl('ul'), 'add', breadcrumbs.cls.nav);
        var li = createEl('li');
        for (var r = rows - 1, ulclone; r >= 0; r--) {
          ulclone = ul.cloneNode(false);
          for (var c = 0, liclone, element; c < columns; c++) {
            liclone = li.cloneNode(false);
            element = crumbsMap[c + ',' + r];
            if (element) {
              classname(liclone, 'add', 'normal', element === _.current ? 'active' : null);
              setattr(liclone, breadcrumbs.cls.data, element);
              crumbs[element].el = liclone;
            }
            ulclone.appendChild(liclone);
          };
          _.breadcrumbs.appendChild(ulclone);
        }
        _.crumbs = crumbs;
      }
    }
  };

  var fx = {

    // CSS rules to apply to a slide on initialize.
    init: function(_, el, trans) {
      var s = slides.get(_, el);
      if (!s.initialized) {
        var display = css(s.el, 'display');
        var init = {
          'display': (display === 'none') ? 'block' : display,
          'visibility': 'hidden',
          'position': 'absolute',
          'opacity': '0',
          'filter': 'alpha(opacity=0)',
          'z-index': '0',
          'pointer-events': 'none',
          'backface-visibility': 'hidden',
          'transform-style': 'preserve-3d'
        }
        if (browser.isIE()) init = extend(init, {'display': 'none', 'visibility': 'visible'});
        s.initialized = true;
        css(s.el, init);
      }
    },

    // Properties defining animation support.
    supported: {
      'none': true,
      'fade': browser.supports('animation', 'opacity'),
      'linear': browser.supports('animation', 'opacity', 'transform'),
      'cube': browser.supports('animation', 'backface-visibility', 'opacity', 'transform', 'transform-style')
    },

    // Defines our slide animations.
    animation: {
      'fade': (function() {
        browser.add['fade']('slidr-fade-in', '0', '1');
        browser.add['fade']('slidr-fade-out', '1', '0');
      })(),
      'linear': {
        'in': {
          'left': function(name, w, o) { browser.add['linear'](name, 'in', 'X(-' + w, 'X(0', o, '1'); },
          'right': function(name, w, o) { browser.add['linear'](name, 'in', 'X(' + w, 'X(0', o, '1'); },
          'up': function(name, h, o) { browser.add['linear'](name, 'in', 'Y(-' + h, 'Y(0', o, '1'); },
          'down': function(name, h, o) { browser.add['linear'](name, 'in', 'Y(' + h, 'Y(0', o, '1'); }
        },
        'out': {
          'left': function(name, w, o) { browser.add['linear'](name, 'out', 'X(0', 'X(' + w, '1', o); },
          'right': function(name, w, o) { browser.add['linear'](name, 'out', 'X(0', 'X(-' + w, '1', o); },
          'up': function(name, h, o) { browser.add['linear'](name, 'out', 'Y(0', 'Y(' + h, '1', o); },
          'down': function(name, h, o) { browser.add['linear'](name, 'out', 'Y(0', 'Y(-' + h, '1', o); }
        }
      },
      'cube': {
        'in': {
          'left': function(name, w, o) { browser.add['cube'](name, 'Y(-9', 'Y(', w/2, o, '1'); },
          'right': function(name, w, o) { browser.add['cube'](name, 'Y(9', 'Y(', w/2, o, '1'); },
          'up': function(name, h, o) { browser.add['cube'](name, 'X(9', 'X(', h/2, o, '1'); },
          'down': function(name, h, o) { browser.add['cube'](name, 'X(-9', 'X(', h/2, o, '1'); }
        },
        'out': {
          'left': function(name, w, o) { browser.add['cube'](name, 'Y(', 'Y(9', w/2, '1', o); },
          'right': function(name, w, o) { browser.add['cube'](name, 'Y(', 'Y(-9', w/2, '1', o); },
          'up': function(name, h, o) { browser.add['cube'](name, 'X(', 'X(-9', h/2, '1', o); },
          'down': function(name, h, o) { browser.add['cube'](name, 'X(', 'X(9', h/2, '1', o); }
        }
      }
    },

    // Resolve keyframe animation name.
    name: function(_, target, trans, type, dir) {
      var parts = ['slidr', trans, type];
      if ((trans === 'linear' || trans === 'cube') && dir) {
        parts.push(dir);
        var opacity = (!!_.settings['fade']) ? '0' : '1';
        if (opacity === '0') parts.push('fade');
        var prop = (dir === 'up' || dir === 'down') ? 'h' : 'w';
        var s = (prop === 'h') ? size.getHeight(target) : size.getWidth(target);
        parts.push(prop, s);
        var keyframe = lookup(fx.animation, [trans, type, dir]);
        if (keyframe) keyframe(parts.join('-'), s, opacity);
      }
      return parts.join('-');
    },

    // Animate an `el` with `trans` effects coming [in|out] as `type` from direction `dir`.
    animate: function(_, el, trans, type, dir, opt_target, opt_z, opt_pointer) {
      var anim = {
        'opacity': (type === 'in') ? '1': '0',
        'filter': 'alpha(opacity=' + (type === 'in' ? '100': '0') + ')',
        'z-index': opt_z || (type === 'in' ? '1': '0'),
        'visibility': (type === 'in') ? 'visible': 'hidden',
        'pointer-events': opt_pointer || (type === 'in' ? 'auto': 'none')
      };
      if (browser.isIE()) anim = extend(anim, {'display': (type === 'in') ? 'block' : 'none', 'visibility': 'visible'});
      var target = opt_target || slides.get(_, el).el;
      var timing = _.settings['timing'][trans];
      if (fx.supported[trans] && timing) {
        var name = fx.name(_, target, trans, type, dir);
        anim['animation'] = (trans === 'none') ? 'none' : [name, timing].join(' ');
      }
      css(target, anim);
      if (slides.get(_, el) && browser.supports('transform')) fx.fixTranslateZ(_, target, type);
    },

    // Toggle translateZ on breadcrumbs/controls so it doesn't interfere with page flow.
    fixTranslateZ: function(_, el, opt_type) {
      var asides = el.getElementsByTagName('aside');
      if (asides.length) {
        for (var i = 0, aside, p, toggle, visibility; aside = asides[i]; i++) {
          if (!!aside.getAttribute('id')) {
            // Get the first parent data-slidr node, or use the current Slidr element.
            p = aside.parentNode;
            while (!getattr(p, 'data-slidr') && tagName(p) !== 'body') p = p.parentNode;
            if (tagName(p) === 'body') p = _.slidr;
            visibility = css(p, 'visibility');
            toggle = (opt_type === 'out' || !opt_type && visibility === 'hidden') ? 'add' :
                     (visibility === 'visible') ? 'rm' : null;
            if (toggle) classname(aside, toggle, 'disabled');
          }
        }
      }
    }
  };

  var size = {

    // Active Slidr's to listen for resize.
    active: {},

    // Add Slidr's we want to monitor.
    autoResize: function(_) {
      size.active[_.id] = { src: _, w: 0, h: 0, d: size.dynamic(_) };
    },

    // Check whether width and height should by dynamically updated.
    dynamic: function(_) {
      var clone = css(_.slidr.cloneNode(false), { 'position': 'absolute', 'opacity': '0', 'filter': 'alpha(opacity=0)' });
      var probe = css(createEl('div'), { 'width': '42px', 'height': '42px' });
      clone.appendChild(probe);
      _.slidr.parentNode.insertBefore(clone, _.slidr);
      var originalWidth = (borderbox(clone) ? size.extraWidth(_.slidr) : 0) + 42;
      var originalHeight = (borderbox(clone) ? size.extraHeight(_.slidr) : 0) + 42;
      var cloneWidth = css(clone, 'width');
      var cloneHeight = css(clone, 'height');
      var minWidth = css(clone, 'min-width');
      var minHeight = css(clone, 'min-height');
      var dynamic = {
        width: cloneWidth === 'auto' || cloneWidth === originalWidth || minWidth !== 0 && minWidth != 'auto',
        height: cloneHeight === 'auto' || cloneHeight === originalHeight || minHeight !== 0 && minHeight != 'auto'
      };
      _.slidr.parentNode.removeChild(clone);
      return dynamic;
    },

    // Returns the sum of all integer arguments passed in, or 0. Best effort.
    sum: function() {
      for (var i = 0, s = 0, arg; arg = arguments[i]; i++) s += arg;
      return isNaN(s) ? 0 : s;
    },

    // Grabs the element width/height margin.
    widthMargin: function(el) {
      return size.sum(Math.max(0, css(el, 'margin-left')), Math.max(0, css(el, 'margin-right')));
    },
    heightMargin: function(el) {
      return size.sum(Math.max(0, css(el, 'margin-top')), Math.max(0, css(el, 'margin-bottom')));
    },

    // Grabs the element width/height padding.
    widthPad: function(el) { return size.sum(css(el, 'padding-left'), css(el, 'padding-right')); },
    heightPad: function(el) { return size.sum(css(el, 'padding-top'), css(el, 'padding-bottom')); },

    // Grabs the element width/height border.
    widthBorder: function(el) { return size.sum(css(el, 'border-left-width'), css(el, 'border-right-width')); },
    heightBorder: function(el) { return size.sum(css(el, 'border-top-width'), css(el, 'border-bottom-width')); },

    // Grabs extra border-box padding.
    extraWidth: function(el) { return size.sum(size.widthPad(el), size.widthBorder(el)); },
    extraHeight: function(el) { return size.sum(size.heightPad(el), size.heightBorder(el)); },

    // Gets the element width/height.
    getWidth: function(el) {
      var w = css(el, 'width');
      if (browser.isIE() && w === 'auto' && el.clientWidth) w = el.clientWidth;
      if (w !== 'auto') w += (size.widthMargin(el) + (borderbox(el) ? 0 : size.extraWidth(el)));
      return w;
    },
    getHeight: function(el) {
      var h = css(el, 'height');
      if (browser.isIE() && h === 'auto' && el.clientHeight) h = el.clientHeight;
      if (h !== 'auto') h += (size.heightMargin(el) + (borderbox(el) ? 0 : size.extraHeight(el)));
      return h;
    },

    // Sets the width/height of our element.
    setWidth: function(el, w) {
      var prop = w;
      if (w !== 'auto' && w !== '') prop = (w + (borderbox(el) ? size.extraWidth(el) : 0)) + 'px';
      css(el, { width: prop });
      return w;
    },
    setHeight: function(el, h) {
      var prop = h;
      if (h !== 'auto' && h !== '') prop = (h + (borderbox(el) ? size.extraHeight(el) : 0)) + 'px';
      css(el, { height: prop });
      return h;
    }
  };

  var nav = {

    // Mouse events.
    mouse: {

      // Slidr's with mouseover.
      over: [],

      // Whether a slidr-id already has mouseover.
      isOver: function(id) { return indexOf(nav.mouse.over, id) >= 0; },

      // Add a slidr-id with mouseover event.
      add: function(id) { if (!nav.mouse.isOver(id)) nav.mouse.over.push(id); },

      // Remove a slidr-id from mouseover event.
      remove: function(id) { if (nav.mouse.isOver(id)) nav.mouse.over.splice(indexOf(nav.mouse.over, id), 1); },

      // Get the current top level Slidr being mouse'd over.
      current: function() {
        var c = nav.mouse.over[nav.mouse.over.length-1];
        for (var i = 0, l = nav.mouse.over.length, m = nav.mouse.over[i]; i < l; i++) if (contains(c, m)) c = m;
        return c;
      },

      // Track mouseenter/mouseleave events.
      track: function(el) {
        bind(el, 'mouseenter', function(e) { nav.mouse.add(browser.sanitize(e).currentTarget.id); });
        bind(el, 'mouseleave', function(e) { nav.mouse.remove(browser.sanitize(e).currentTarget.id); });
      }
    },

    // Keyboard events.
    keyboard: (function() {
      bind(document, 'keydown', function(e) {
        e = browser.sanitize(e);
        if (nav.mouse.current() && e.which <= 40 && e.which >= 37) {
          var c = INSTANCES[nav.mouse.current()];
          var dir = null;
          if (e.which === 40 && c['canSlide']('down')) { dir = 'down'; }
          else if (e.which === 39 && c['canSlide']('right')) { dir = 'right'; }
          else if (e.which === 38 && c['canSlide']('up')) { dir = 'up'; }
          else if (e.which === 37 && c['canSlide']('left')) { dir = 'left'; }
          if (dir) c['slide'](dir) && browser.stop(e);
        }
      });
    })(),

    // Touch events.
    touch: function(_) {
      var start = {};
      var delta = {};
      bind(_.slidr, 'touchstart', function(e) {
        e = browser.sanitize(e);
        start = { x: e.touches[0].pageX, y: e.touches[0].pageY, time: +new Date };
        delta = { x: 0, y: 0, duration: 0 };
      });
      bind(_.slidr, 'touchmove', function(e) {
        e = browser.sanitize(e);
        if (e.touches.length > 1 || e.scale && e.scale !== 1) return;
        delta.x = e.touches[0].pageX - start.x;
        delta.y = e.touches[0].pageY - start.y;
        delta.duration = +new Date - start.time;
        if (delta.duration > 100 && (Math.abs(delta.x) + Math.abs(delta.y))/delta.duration < 0.25) return;
        browser.stop(e);
      });
      bind(_.slidr, 'touchend', function(e) {
        e = browser.sanitize(e);
        if (Number(+new Date - start.time) < 250) {
          var dx = Math.abs(delta.x);
          var dy = Math.abs(delta.y);
          var validH = dx > 20;
          var validV = dy > 20;
          var dirH = delta.x < 0 ? 'right': 'left';
          var dirV = delta.y < 0 ? 'down' : 'up';
          var dir = (validH && validV ? (dx > dy ? dirH : dirV) : (validH ? dirH : (validV ? dirV : null)));
          if (dir) actions.slide(_, dir);
          browser.stop(e);
        }
      });
    }
  };

  var actions = {

    // Starts a Slidr.
    start: function(_, opt_start) {
      if (!_.started && _.slidr) {
        var display = css(_.slidr, 'display');
        var position = css(_.slidr, 'position');
        var opacity = css(_.slidr, 'opacity');
        css(_.slidr, {
          'visibility': 'visible',
          'opacity': opacity,
          'filter': 'alpha(opacity=' + opacity * 100 + ')',
          'display': (display === 'inline-block' || display === 'inline') ? 'inline-block' : 'block',
          'position': (position === 'static') ? 'relative' : position,
          'overflow': (!!_.settings['overflow']) ? css(_.slidr, 'overflow') : 'hidden',
          'transition': 'height 0.05s ease-out, width 0.05s ease-out',
          'tap-highlight-color': 'rgba(0, 0, 0, 0)',
          'touch-callout': 'none'
        });
        if (!_.start) actions.add(_, _.settings['direction'], slides.find(_, true), _.settings['transition']);
        if (slides.get(_, opt_start)) _.start = opt_start;
        slides.display(_);
        size.autoResize(_);
        fx.fixTranslateZ(_, _.slidr);
        if (_.settings['keyboard']) nav.mouse.track(_.slidr);
        if (_.settings['touch']) nav.touch(_);
        _.started = true;
        controls.update(_);
      }
    },

    // Can we slide?
    canSlide: function(_, next) {
      return _.started && next && (slides.isdir(next) ? !!slides.get(_, _.current, next) : !!slides.get(_, next));
    },

    // Slide.
    slide: function(_, next) {
      if (actions.canSlide(_, next)) slides.slide(_, next);
    },

    // Adds a set of slides.
    add: function(_, direction, ids, opt_transition, opt_overwrite) {
      if (_.slidr) {
        var trans = transition.validate(_, opt_transition);
        var valid = slides.find(_);
        var prev = (direction === 'horizontal' || direction === 'h') ? 'left' : 'up';
        var next = (direction === 'horizontal' || direction === 'h') ? 'right' : 'down';
        if (!slides.validate(_, ids, trans, valid, prev, next) && !opt_overwrite) {
          console.warn('[Slidr] Error adding [' + direction + '] slides for [' + _.id + '].');
        } else {
          slides.add(_, ids, trans, valid, prev, next);
        }
      }
    },

    // Automatically transition between slides.
    auto: function(_, msec, direction) {
      if (_.started && slides.isdir(direction)) {
        actions.stop(_);
        _.auto.msec = msec;
        _.auto.direction = direction;
        _.auto.id = setInterval(function() {
          if (!(_.settings['pause'] && nav.mouse.isOver(_.id))) slides.slide(_, direction);
        }, msec);
      }
    },

    // Stops auto transitioning.
    stop: function(_) {
      if (_.started && _.auto.id) {
        clearInterval(_.auto.id);
        _.auto.id = null;
      }
    },

    // Toggle breadcrumbs.
    breadcrumbs: function(_) {
      if (_.breadcrumbs && _.displayed) {
        var type = css(_.breadcrumbs, 'opacity') === '0' ? 'in' : 'out';
        fx.animate(_, null, 'fade', type, null, _.breadcrumbs, '3', 'none');
        if (_.controls) classname(_.controls, type === 'in' ? 'add' : 'rm', 'breadcrumbs');
      }
    },

    // Toggle controls.
    controls: function(_, opt_scheme) {
      if (_.controls && _.displayed) {
        if (!controls.valid(opt_scheme)) opt_scheme = null;
        var hidden = css(_.controls, 'visibility') === 'hidden';
        var type = (opt_scheme && opt_scheme !== 'none') ? 'in' : 'out';
        if (type === 'out' && hidden) return;
        if (opt_scheme === 'border') classname(_.controls, 'add', 'border');
        else if (opt_scheme === 'corner') classname(_.controls, 'rm', 'border');
        fx.animate(_, null, 'fade', type, null, _.controls, '2', 'none');
      }
    }
  };

  // The Slidr constructor.
  var Slidr = function(id, el, settings) {

    var _ = {
      // Slidr id.
      id: id,

      // Reference to the Slidr element.
      slidr: el,

      // Reference to the Slidr breadcrumbs element.
      breadcrumbs: null,

      // Reference to the Slidr controller element.
      controls: null,

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

      // The auto() metadata.
      auto: { id: null, msec: 5000, direction: 'right' },

      // A {mapping} of slides to their neighbors.
      slides: {},

      // A {mapping} of slides and their transition effects.
      trans: {},

      // A {mapping} of slides and their (x, y) position.
      crumbs: {},

      // Reference to the Slidr controller navigators.
      nav: { 'up': null, 'down': null, 'left': null, 'right': null }
    };

    var api = {

      /**
       * Start the Slidr!
       * Automatically finds slides to create if nothing was added prior to calling start().
       * @param {string} opt_start `data-slidr` id to start on.
       * @return {this}
       */
      'start': function(opt_start) {
        actions.start(_, opt_start);
        return this;
      },

      /**
       * Check whether we can slide.
       * @param {string} next a direction ('up', 'down', 'left', 'right') or a `data-slidr` id.
       * @return {boolean}
       */
      'canSlide': function(next) {
        return actions.canSlide(_, next);
      },

      /**
       * Slide!
       * @param {string} next a direction ('up', 'down', 'left', 'right') or a `data-slidr` id.
       * @return {this}
       */
      'slide': function(next) {
        actions.slide(_, next);
        return this;
      },

      /**
       * Adds a set of slides.
       * @param {string} direction `horizontal || h` or `vertical || v`.
       * @param {Array} ids A list of `data-slidr` id's to add to Slidr. Slides must be direct children of the Slidr.
       * @param {string=} opt_transition The transition to apply between the slides, or uses the default.
       * @param {boolean=} opt_overwrite Whether to overwrite existing slide mappings/transitions if conflicts occur.
       * @return {this}
       */
      'add': function(direction, ids, opt_transition, opt_overwrite) {
        actions.add(_, direction, ids, opt_transition, opt_overwrite);
        return this;
      },

      /**
       * Automatically advance to the next slide after a certain timeout. Calls start() if not already called.
       * Reuses any previous parameters (msec and direction) if auto() is called to resume after stop().
       * @param {int=} opt_msec The number of millis between each slide transition. Default is 5000 (5 seconds).
       * @param {string=} opt_direction 'up', 'down', 'left', or 'right'. Default is 'right'.
       * @param {string=} opt_start The `data-slidr` id to start at (only works if auto is called to start the Slidr).
       * @return {this}
       */
      'auto': function(opt_msec, opt_direction, opt_start) {
        actions.start(_, opt_start);
        actions.auto(_, opt_msec || _.auto.msec, opt_direction || _.auto.direction);
        return this;
      },

      /**
       * Stop auto transition if it's turned on.
       * @return {this}
       */
      'stop': function() {
        actions.stop(_);
        return this;
      },

      /**
       * Set custom animation timings.
       * @param {string|Object} transition Either a transition name (i.e. 'cube'), or a {'transition': 'timing'} object.
       * @param {string=} opt_timing The new animation timing (i.e "0.5s ease-in"). Not required if transition is an object.
       * @return {this}
       */
      'timing': function(transition, opt_timing) {
        if (!!transition && transition.constructor === Object) {
          _.settings['timing'] = extend(_.settings['timing'], transition);
        } else if (typeof(transition) === 'string' && typeof(opt_timing) === 'string') {
          _.settings['timing'][transition] = opt_timing;
        }
        return this;
      },

      /**
       * Toggle breadcrumbs.
       * @return {this}
       */
      'breadcrumbs': function() {
        actions.breadcrumbs(_);
        return this;
      },

      /**
       * Toggle controls.
       * @param {string=} opt_scheme Toggle on/off if not present, else change scheme. `border`, `corner` or `none`.
       * @return {this}
       */
      'controls': function(opt_scheme) {
        actions.controls(_, opt_scheme);
        return this;
      }
    };

    return api;
  };

  // Global timer for dynamic sizing.
  var TIMER = setInterval((function watch() {
    var _, cur, index, el, width, height;
    for (index in size.active) {
      cur = size.active[index];
      _ = cur.src;
      if (!browser.isIE() && !contains(document, _.slidr)) {
        delete size.active[index];
        delete INSTANCES[_.id];
      } else if (css(_.slidr, 'visibility') === 'hidden') {
        size.active[index].w = size.setWidth(_.slidr, 0);
        size.active[index].h = size.setHeight(_.slidr, 0);
      } else if (slides.get(_, _.current)) {
        el = slides.get(_, _.current).el;
        width = size.getWidth(el);
        height = size.getHeight(el);
        if (cur.d.width && cur.w != width) size.active[index].w = size.setWidth(_.slidr, width);
        if (cur.d.height && cur.h != height) size.active[index].h = size.setHeight(_.slidr, height);
      }
    }
    return watch;
  })(), 250);

  // Current version.
  var VERSION = '0.5.0';

  // Active Slidr instances.
  var INSTANCES = {};

  // Callback no-op.
  var NOOP = function() {};

  // Slidr default settings.
  var DEFAULTS = {
    'after': NOOP,                // Callback function after a slide transition finishes.
    'before': NOOP,               // Callback function before a slide transition begins.
    'breadcrumbs': false,         // Show or hide breadcrumbs on start(). `true` or `false`.
    'controls': 'border',         // Show or hide control arrows on start(). `border`, `corner` or `none`.
    'direction': 'horizontal',    // The default direction for new slides. `horizontal` or `h`, `vertical` or `v`.
    'fade': true,                 // Whether slide transitions should fade in/out. `true` or `false`.
    'keyboard': false,            // Whether to enable keyboard navigation upon mouseover. `true` or `false`.
    'overflow': false,            // Whether to overflow transitions at slidr borders. `true` or `false`.
    'pause': false,               // Whether to pause on mouseover when running in auto(). `true` or `false`.
    'theme': '#fff',              // Sets color theme for breadcrumbs/controls. #hexcode or rgba(value).
    'timing': {},                 // Custom animation timings to apply. {'transition': 'timing'}.
    'touch': false,               // Whether to enable touch navigation for mobile devices. `true` or `false`.
    'transition': 'linear'        // The default transition to apply. `cube`, `linear`, `fade`, or `none`.
  };

  // Slidr default animation timings.
  var TIMING = {
    'none': 'none',
    'fade': '0.4s ease-out',
    'linear': '0.6s ease-out',
    'cube': '1s cubic-bezier(0.15, 0.9, 0.25, 1)'
  };

  // Global API.
  return {
    /**
     * Current version.
     * @return {string} major.minor.patch.
     */
    'version': function() {
      return VERSION;
    },

    /**
     * Available transitions.
     * @return {Array} of transitions.
     */
    'transitions': function() {
      return transition.available.slice(0);
    },

    /**
     * Creates and returns a Slidr.
     * Calling create on the same element twice returns the already instantiated Slidr.
     * @param {string} id The element id to turn into a Slidr.
     * @param {Object=} opt_settings Settings to apply.
     */
    'create': function(id, opt_settings) {
      var el = document.getElementById(id);
      if (!el) {
        console.warn('[Slidr] Could not find element with id [' + id + '].');
        return;
      }
      var settings = extend(DEFAULTS, opt_settings || {});
      settings['timing'] = extend(TIMING, settings['timing']);
      INSTANCES[id] = INSTANCES[id] || new Slidr(id, el, settings);
      return INSTANCES[id];
    }
  };

}));
