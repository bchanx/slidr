/*!
 * slidr v0.1.0 - A Javascript library for adding slide effects.
 * http://bchanx.com/slidr
 * MIT licensed
 *
 * Copyright (c) 2013 Brian Chan (bchanx.com)
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
      if (!result.hasOwnProperty(keys[k])) return null;
      result = result[keys[k]];
    }
    return (result === obj) ? null : result;
  }

  // Merge all properties from {arguments} to {obj} if it's not yet defined.
  function extend(obj /* arg1, arg2.. */) {
    for (var i = 1, arg; arg = arguments[i]; i++) for (var a in arg) if (obj[a] === undefined) obj[a] = arg[a];
    return obj;
  }

  // Check whether node a contains node b.
  function contains(a, b) {
    return (a.contains) ? a.contains(b) : a.compareDocumentPosition(b) & 16;
  }

  // Creates a document element, and sets any properties passed in.
  function createEl(tag, props) {
    var el = document.createElement(tag);
    for (var p in props) el[p] = props[p];
    return el;
  }

  // Add/rm class(es) on an element.
  function classname(el, type /* class1, class2... */) {
    for (var a = 2, cls; cls = arguments[a]; a++) {
      if (type === 'add' && el.className.indexOf(cls) < 0) el.className += ' ' + cls;
      if (type === 'rm' && el.className.indexOf(cls) >= 0) el.className = el.className.replace(cls, '');
    }
    el.className = el.className.trim();
    return el;
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
      var style = window.getComputedStyle(el)[browser.fix(prop)];
      return (style) ? (style.slice(-2) === 'px' && style.indexOf('px') == style.length - 2) ? 
        parseInt(style.slice(0, -2)) : style : 'none';
    }
    for (var p in prop) if (browser.fix(p)) el.style[browser.fix(p)] = prop[p];
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
      var el = createEl('style', { 'type' : 'text/css' });
      document.getElementsByTagName('head')[0].appendChild(el);
      return el.sheet || el.styleSheet;
    }()),

    // Adds a CSS rule to our Slidr stylesheet.
    addCSSRule: function(name, rule, opt_safe) {
      for (var r = 0, cssRule; cssRule = browser.styleSheet.cssRules[r]; r++) {
        if (cssRule.name == name || cssRule.selectorText === name) {
          if (!!opt_safe || cssRule.cssText.replace(/\s/gi, '') === rule.replace(/\s/gi, '')) return;
          browser.styleSheet.deleteRule(r);
          break;
        }
      }
      browser.styleSheet.insertRule(rule, browser.styleSheet.cssRules.length);
    },

    // Creates a style rule.
    createStyle: function(name, props, opt_safe) {
      var rule = [name, '{'];
      for (var p in props) rule.push(browser.fix(p, true) + ':' + props[p] + ';');
      rule.push('}');
      browser.addCSSRule(name, rule.join(' '), opt_safe);
    },

    // Creates a keyframe animation rule.
    createKeyframe: function(name, rules) {
      var animation = browser.fix('animation', true);
      if (animation) {
        var prefix = (animation.lastIndexOf('-') > 0) ? animation.slice(0, animation.lastIndexOf('-') + 1) : '';
        var rule = ['@' + prefix + 'keyframes ' + name + ' {'];
        for (var r in rules) {
          rule.push(r + '% {');
          for (var p in rules[r]) rule.push(browser.fix(p, true) + ': ' + rules[r][p] + ';');
          rule.push('}');
        }
        rule.push('}');
        browser.addCSSRule(name, rule.join(' '));
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
      return lookup(_.trans, [el, (type === 'in') ? transition.opposite(dir) : dir]);
    },

    // Sets the direction transition for an element.
    set: function(_, el, dir, trans) {
      trans = transition.validate(_, trans);
      if (!_.trans[el]) _.trans[el] = {};
      _.trans[el][dir] = trans;
      return trans;
    },

    // Applies a directional transition to an element entering/leaving the Slidr.
    apply: function(_, el, type, dir, opt_trans) {
      var trans = opt_trans || transition.get(_, el, type, dir);
      if (trans) {
        breadcrumbs.update(_, el, type);
        fx.animate(_, el, trans, type, dir);
      }
    },

    // Get the opoosite direction.
    opposite: function(dir) {
      return (dir === 'up') ? 'down' : (dir === 'down') ? 'up' : (dir === 'left') ? 'right' :
        (dir === 'right') ? 'left' : (dir === 'top') ? 'bottom' : (dir === 'bottom') ? 'top' : null;
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
        breadcrumbs.create(_);
        controls.create(_);
        fx.init(_, _.current, 'fade');
        fx.animate(_, _.current, 'fade', 'in');
        _.displayed = true;
        if (_.settings['breadcrumbs']) actions.breadcrumbs(_)
        if (_.settings['controls']) actions.controls(_, _.settings['controls'])
      }
    },

    // Transition to the next slide in direction `dir`.
    slide: function(_, dir) {
      return slides.jump(_, slides.get(_, _.current, dir), dir, dir);
    },

    // Jump to a target slide.
    jump: function(_, el, outdir, indir, opt_outtrans, opt_intrans) {
      if (_.current && el) {
        transition.apply(_, el, 'in', indir, opt_intrans);
        transition.apply(_, _.current, 'out', outdir, opt_outtrans);
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
          if (opt_asList && valid.indexOf(name) < 0) valid.push(name);
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

    // Classname
    cls: {
      ctrlr: 'slidr-controller',
      ctrl: 'slidr-control',
      icon: 'slidr-control-icon'
    },

    // Create controls container.
    create: function(_) {
      if (_.slidr && !_.controls) {
        _.controls = css(classname(
          createEl('div', { 'id': _.id + '-' + controls.cls.ctrlr }), 'add', controls.cls.ctrlr), {
          'opacity': '0',
          'z-index': '0',
          'pointer-events': 'none'
        });
        for (var n in _.nav) {
          _.nav[n] = setattr(classname(createEl('div'), 'add', controls.cls.ctrl, n), 'data-' + controls.cls.ctrl, n);
          _.nav[n].appendChild(classname(createEl('div'), 'add', controls.cls.icon));
          _.controls.appendChild(_.nav[n]);
        }
        controls.css(_);
        _.slidr.appendChild(_.controls);
        (_.controls.attachEvent) ? _.controls.attachEvent('onclick', controls.onclick(_)) :
                                   _.controls.addEventListener('click', controls.onclick(_));
      }
    },

    // Controls CSS rules.
    css: function(_) {
      browser.createStyle('.' + controls.cls.ctrlr, {
        'position': 'absolute',
        'bottom': '0',
        'right': '0',
        'padding': '10px',
        'box-sizing': 'border-box',
        'width': '75px',
        'height': '75px'
      }, true);
      browser.createStyle('.' + controls.cls.ctrlr + '.breadcrumbs', {
        'left': '0',
        'right': 'auto'
      }, true);
      browser.createStyle('.' + controls.cls.ctrlr + '.border', {
        'width': '100%',
        'height': '100%'
      }, true);
      browser.createStyle('.' + controls.cls.ctrl, {
        'position': 'absolute',
        'pointer-events': 'auto',
        'cursor': 'pointer',
        'transition': 'opacity 0.2s linear'
      }, true);
      browser.createStyle('.' + controls.cls.ctrl + '.disabled', {
        'opacity': '0.1',
        'cursor': 'auto'
      }, true);
      browser.createStyle('.' + controls.cls.icon, {
        'pointer-events': 'none',
        'width': '0',
        'height': '0',
        'border': '8px transparent solid',
        'position': 'absolute'
      }, true);

      for (var n in _.nav) {
        var horizontal = (n === 'left' || n === 'right');
        var pos = (n === 'up') ? 'top' : (n === 'down') ? 'bottom' : n;
        var dir = horizontal ? 'top' : 'left';

        var ctrl = {
          'width': horizontal ? '22px': '16px',
          'height': horizontal ? '16px' : '22px'
        };
        ctrl[pos] = '0';
        ctrl[dir] = '50%';
        ctrl['margin-' + dir] = '-8px';
        browser.createStyle('.' + controls.cls.ctrl + '.' + n, ctrl, true);

        var icon = {};
        icon['border-' + transition.opposite(pos) + '-width'] = '12px';
        icon['border-' + pos + '-width'] = '10px';
        icon['border-' + transition.opposite(pos) + '-color'] = 'white';
        icon[pos] = '0';
        icon[dir] = '50%';
        icon['margin-' + dir] = '-8px';
        browser.createStyle('.' + controls.cls.ctrl + '.' + n + ' .' + controls.cls.icon, icon, true);

        var border = {};
        border[horizontal ? 'height': 'width'] = '100%';
        border[dir] = '0';
        border['margin-' + dir] = '0';
        browser.createStyle('.' + controls.cls.ctrlr + '.border' + ' .' + controls.cls.ctrl + '.' + n, border, true);
      }
    },

    // On click callback.
    onclick: function(_) {
      return function handler(e) {
        e = e || window.event;
        if (!e.target) e.target = e.srcElement;
        actions.slide(_, getattr(e.target, 'data-' + controls.cls.ctrl));
      }
    },

    // Update controls.
    update: function(_) {
      for (var n in _.nav) {
        classname(_.nav[n], actions.canSlide(_, n) ? 'rm' : 'add', 'disabled');
      }
    }
  };

  var breadcrumbs = {
  
    // Classname
    cls: 'slidr-breadcrumbs',

    // Initialize breadcrumbs container.
    init: function(_) {
      if (_.slidr && !_.breadcrumbs) {
        _.breadcrumbs = css(createEl('div', { 'id': _.id + '-' + breadcrumbs.cls }), {
          'position': 'absolute',
          'bottom': '0',
          'right': '0',
          'opacity': '0',
          'z-index': '0',
          'padding': '10px',
          'pointer-events': 'none',
          'box-sizing': 'border-box'
        });
        breadcrumbs.css();
        _.slidr.appendChild(_.breadcrumbs);
        (_.breadcrumbs.attachEvent) ? _.breadcrumbs.attachEvent('onclick', breadcrumbs.onclick(_)) :
                                      _.breadcrumbs.addEventListener('click', breadcrumbs.onclick(_));
      }
    },

    // Breadcrumbs CSS rules.
    css: function() {
      browser.createStyle('.' + breadcrumbs.cls, {
        'font-size': '0',
        'line-height': '0'
      }, true);
      browser.createStyle('.' + breadcrumbs.cls + ' li', {
        'width': '10px',
        'height': '10px',
        'display': 'inline-block',
        'margin': '3px'
      }, true);
      browser.createStyle('.' + breadcrumbs.cls + ' li.normal', {
        'border-radius': '100%',
        'border': '1px white solid',
        'cursor': 'pointer',
        'pointer-events': 'auto'
      }, true);
      browser.createStyle('.' + breadcrumbs.cls + ' li.active', {
        'width': '12px',
        'height': '12px',
        'margin': '2px',
        'background-color': 'white'
      }, true);
    },

    // On click callback.
    onclick: function(_) {
      return function handler(e) {
        e = e || window.event;
        if (!e.target) e.target = e.srcElement;
        var el = getattr(e.target, 'data-' + breadcrumbs.cls);
        if (el && el !== _.current && slides.get(_, el)) {
          var cur = _.crumbs[_.current];
          var next = _.crumbs[el];
          var hdir = (cur.x < next.x) ? 'right' : (cur.x > next.x) ? 'left' : null;
          var vdir = (cur.y < next.y) ? 'up': (cur.y > next.y) ? 'down': null;
          var outdir = (transition.get(_, _.current, 'out', hdir)) ? hdir :
                       (transition.get(_, _.current, 'out', vdir)) ? vdir : null;
          var indir = (transition.get(_, el, 'in', hdir)) ? hdir :
                      (transition.get(_, el, 'in', vdir)) ? vdir : null;
          slides.jump(_, el, outdir, indir, (outdir) ? null : 'fade', (indir) ? null : 'fade');
        }
      }
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
        var ul = classname(createEl('ul'), 'add', breadcrumbs.cls);
        var li = createEl('li');
        for (var r = rows - 1, ulclone; r >= 0; r--) {
          ulclone = ul.cloneNode(false);
          for (var c = 0, liclone, element; c < columns; c++) {
            liclone = li.cloneNode(false);
            element = crumbsMap[c + ',' + r];
            if (element) {
              classname(liclone, 'add', 'normal', element === _.current ? 'active' : null);
              setattr(liclone, 'data-' + breadcrumbs.cls, element);
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
      var init = lookup(fx.animation, [trans, 'init']) || {};
      var s = slides.get(_, el);
      if (!s.initialized) {
        var display = css(s.el, 'display');
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
      css(s.el, init);
    },

    // Properties defining animation support.
    supported: {
      'none': true,
      'fade': browser.supports('animation', 'opacity'),
      'linear': browser.supports('transform', 'opacity'),
      'cube': browser.supports('animation', 'backface-visibility', 'transform-style', 'transform', 'opacity')
    },

    // Timing functions for our animations.
    timing: {
      'none': function(name) { return 'none'; },
      'fade': function(name) { return name + ' 0.4s ease-out 0s'; },
      'linear': function(name) { return name + ' 0.6s ease-out 0s'; },
      'cube': function(name) { return name + ' 1s cubic-bezier(0.15, 0.9, 0.25, 1) 0s'; }
    },

    // Defines our slide animations.
    animation: {
      'fade': {
        'init': (function() {
          browser.add['fade']('slidr-fade-in', '0', '1');
          browser.add['fade']('slidr-fade-out', '1', '0');
          return null; 
        })()
      },
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
        'init': { 'backface-visibility': 'hidden', 'transform-style': 'preserve-3d' },
        'in': {
          'left': function(name, w, o) { browser.add['cube'](name, 'Y(-90', 'Y(0', w/2, o, '1'); },
          'right': function(name, w, o) { browser.add['cube'](name, 'Y(90', 'Y(0', w/2, o, '1'); },
          'up': function(name, h, o) { browser.add['cube'](name, 'X(90', 'X(0', h/2, o, '1'); },
          'down': function(name, h, o) { browser.add['cube'](name, 'X(-90', 'X(0', h/2, o, '1'); }
        },
        'out': {
          'left': function(name, w, o) { browser.add['cube'](name, 'Y(0', 'Y(90', w/2, '1', o); },
          'right': function(name, w, o) { browser.add['cube'](name, 'Y(0', 'Y(-90', w/2, '1', o); },
          'up': function(name, h, o) { browser.add['cube'](name, 'X(0', 'X(-90', h/2, '1', o); },
          'down': function(name, h, o) { browser.add['cube'](name, 'X(0', 'X(90', h/2, '1', o); }
        }
      }
    },

    // Resolve keyframe animation name.
    name: function(_, trans, type, dir) {
      var parts = [trans === 'fade' ? 'slidr' : _.id, trans, type];
      if (trans !== 'fade') parts.push(dir);
      return parts.join('-');
    },

    // Animate an `el` with `trans` effects coming [in|out] as `type` from direction `dir`.
    animate: function(_, el, trans, type, dir, opt_target, opt_z, opt_pointer) {
      var anim = {
        'opacity': (type === 'in') ? '1': '0',
        'z-index': opt_z || (type === 'in' ? '1': '0'),
        'pointer-events': opt_pointer || (type === 'in' ? 'auto': 'none')
      };
      var el = opt_target || slides.get(_, el).el;
      if (fx.supported[trans] && fx.timing[trans]) {
        var name = fx.name(_, trans, type, dir);
        var keyframe = lookup(fx.animation, [trans, type, dir]);
        if (keyframe && dir) {
          var size = css(el, (dir === 'up' || dir === 'down') ? 'height' : 'width');
          var opacity = _.settings['fading'] ? '0' : '1';
          keyframe(name, size, opacity);
        }
        anim['animation'] = fx.timing[trans](name);
      }
      css(el, anim);
    }
  };

  var size = {

    // Check whether width, height, and borderbox should by dynamically updated.
    dynamic: function(_) {
      var clone = css(_.slidr.cloneNode(false), { 'position': 'absolute', 'opacity': '0' });
      var probe = css(createEl('div'), { 'width': '42px', 'height': '42px' });
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
          var el = slides.get(_, _.current).el;
          var height = css(el, 'height');
          var width = css(el, 'width');
          if (d.height && h != height) h = size.setHeight(_, height, d.borderbox);
          if (d.width && w != width) w = size.setWidth(_, width, d.borderbox);
        }
        return watch;
      })(), 250);
    }
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
        controls.update(_);
      }
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
        if (opt_scheme === 'border') classname(_.controls, 'add', 'border');
        if (opt_scheme === 'corner') classname(_.controls, 'rm', 'border');
        var type = (opt_scheme || css(_.controls, 'opacity') === '0') ? 'in' : 'out';
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

      // Whether auto() is currently active. Stores the timer interval id.
      auto: null,

      // A {mapping} of slides to their neighbors.
      slides: {},

      // A {mapping} of slides and their transition effects.
      trans: {},

      // A {mapping} of slides and their (x, y) position.
      crumbs: {},

      // Reference to the Slidr controller navigators.
      nav: { 'left': null, 'right': null, 'up': null, 'down': null }
    };

    var api = {

      /**
       * Start the Slidr! Automatically finds slides to create if nothing was added prior to calling start().
       * @param {string} opt_start `data-slidr` id to start on.
       * @return {this}
       */
      'start': function(opt_start) {
        actions.start(_, opt_start);
        return this;
      },

      /**
       * Check whether we can slide.
       * @param {string} dir 'up', 'down', 'left' or 'right'.
       * @return {boolean}
       */
      'canSlide': function(dir) {
        return actions.canSlide(_, dir);
      },

      /**
       * Slide.
       * @param {string} dir slide 'up', 'down', 'left', or 'right'.
       * @return {this}
       */
      'slide': function(dir) {
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
      'add': function(direction, ids, opt_transition, opt_overwrite) {
        actions.add(_, direction, ids, opt_transition, opt_overwrite);
        return this;
      },

      /**
       * Automatically advance to the next slide after a certain timeout. Calls start() if not already called.
       * @param {string} direction 'up', 'down', 'left', or 'right'. Defaults to 'right'.
       * @param {int} msec The number of millis between each slide transition. Defaults to 5000 (5 seconds).
       * @param {string} opt_start The `data-slidr` id to start at (only works if auto was called to start the Slidr).
       */
      'auto': function(direction, msec, opt_start) {
        actions.start(_, opt_start);
        actions.auto(_, direction || 'right', msec || 5000);
        return this;
      },

      /**
       * Stop auto transition if it's turned on.
       */
      'stop': function() {
        actions.stop(_);
        return this;
      },

      /**
       * Toggle breadcrumbs.
       */
      'breadcrumbs': function() {
        actions.breadcrumbs(_);
        return this;
      },

      /**
       * Toggle controls.
       * @param {string?} opt_scheme Change the control scheme layout to either `corner` or `border`.
       */
      'controls': function(opt_scheme) {
        actions.controls(_, opt_scheme);
        return this;
      }
    };

    return api;
  };

  // Current version.
  var VERSION = '0.1.0';

  // Active Slidr instances.
  var INSTANCES = {};

  // Slidr default settings.
  var DEFAULTS = {
    'transition': 'none',         // The default transition to apply to slides for add(). See slidr.transitions().
    'direction': 'horizontal',    // The default direction for new slides in add(). `horizontal || h`, `vertical || v`.
    'fading': true,               // Whether slide transitions should fade in/out. `true` or `false`.
    'clipping': false,            // Whether to clip transitions at the slidr container borders. `true` or `false`.
    'breadcrumbs': false,         // Show or hide breadcrumbs on start(). `true` or `false`.
    'controls': ''                // Show or hide control arrows on start(). Available schemes: `corner` or `border`.
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
     * Creates a Slidr.
     * @param {string} id The element id to turn into a Slidr.
     * @param {Object} opt_settings Settings to apply.
     */
    'create': function(id, opt_settings) {
      var el = document.getElementById(id);
      if (!el) {
        console.warn('[Slidr] Could not find element with id: ' + id + '.');
        return;
      }
      INSTANCES[id] = INSTANCES[id] || new Slidr(id, el, extend(opt_settings || {}, DEFAULTS));
      return INSTANCES[id];
    }
  };

}));

