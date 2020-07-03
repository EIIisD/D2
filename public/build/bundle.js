
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.23.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function define(constructor, factory, prototype) {
      constructor.prototype = factory.prototype = prototype;
      prototype.constructor = constructor;
    }

    function extend(parent, definition) {
      var prototype = Object.create(parent.prototype);
      for (var key in definition) prototype[key] = definition[key];
      return prototype;
    }

    function Color() {}

    var darker = 0.7;
    var brighter = 1 / darker;

    var reI = "\\s*([+-]?\\d+)\\s*",
        reN = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)\\s*",
        reP = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)%\\s*",
        reHex = /^#([0-9a-f]{3,8})$/,
        reRgbInteger = new RegExp("^rgb\\(" + [reI, reI, reI] + "\\)$"),
        reRgbPercent = new RegExp("^rgb\\(" + [reP, reP, reP] + "\\)$"),
        reRgbaInteger = new RegExp("^rgba\\(" + [reI, reI, reI, reN] + "\\)$"),
        reRgbaPercent = new RegExp("^rgba\\(" + [reP, reP, reP, reN] + "\\)$"),
        reHslPercent = new RegExp("^hsl\\(" + [reN, reP, reP] + "\\)$"),
        reHslaPercent = new RegExp("^hsla\\(" + [reN, reP, reP, reN] + "\\)$");

    var named = {
      aliceblue: 0xf0f8ff,
      antiquewhite: 0xfaebd7,
      aqua: 0x00ffff,
      aquamarine: 0x7fffd4,
      azure: 0xf0ffff,
      beige: 0xf5f5dc,
      bisque: 0xffe4c4,
      black: 0x000000,
      blanchedalmond: 0xffebcd,
      blue: 0x0000ff,
      blueviolet: 0x8a2be2,
      brown: 0xa52a2a,
      burlywood: 0xdeb887,
      cadetblue: 0x5f9ea0,
      chartreuse: 0x7fff00,
      chocolate: 0xd2691e,
      coral: 0xff7f50,
      cornflowerblue: 0x6495ed,
      cornsilk: 0xfff8dc,
      crimson: 0xdc143c,
      cyan: 0x00ffff,
      darkblue: 0x00008b,
      darkcyan: 0x008b8b,
      darkgoldenrod: 0xb8860b,
      darkgray: 0xa9a9a9,
      darkgreen: 0x006400,
      darkgrey: 0xa9a9a9,
      darkkhaki: 0xbdb76b,
      darkmagenta: 0x8b008b,
      darkolivegreen: 0x556b2f,
      darkorange: 0xff8c00,
      darkorchid: 0x9932cc,
      darkred: 0x8b0000,
      darksalmon: 0xe9967a,
      darkseagreen: 0x8fbc8f,
      darkslateblue: 0x483d8b,
      darkslategray: 0x2f4f4f,
      darkslategrey: 0x2f4f4f,
      darkturquoise: 0x00ced1,
      darkviolet: 0x9400d3,
      deeppink: 0xff1493,
      deepskyblue: 0x00bfff,
      dimgray: 0x696969,
      dimgrey: 0x696969,
      dodgerblue: 0x1e90ff,
      firebrick: 0xb22222,
      floralwhite: 0xfffaf0,
      forestgreen: 0x228b22,
      fuchsia: 0xff00ff,
      gainsboro: 0xdcdcdc,
      ghostwhite: 0xf8f8ff,
      gold: 0xffd700,
      goldenrod: 0xdaa520,
      gray: 0x808080,
      green: 0x008000,
      greenyellow: 0xadff2f,
      grey: 0x808080,
      honeydew: 0xf0fff0,
      hotpink: 0xff69b4,
      indianred: 0xcd5c5c,
      indigo: 0x4b0082,
      ivory: 0xfffff0,
      khaki: 0xf0e68c,
      lavender: 0xe6e6fa,
      lavenderblush: 0xfff0f5,
      lawngreen: 0x7cfc00,
      lemonchiffon: 0xfffacd,
      lightblue: 0xadd8e6,
      lightcoral: 0xf08080,
      lightcyan: 0xe0ffff,
      lightgoldenrodyellow: 0xfafad2,
      lightgray: 0xd3d3d3,
      lightgreen: 0x90ee90,
      lightgrey: 0xd3d3d3,
      lightpink: 0xffb6c1,
      lightsalmon: 0xffa07a,
      lightseagreen: 0x20b2aa,
      lightskyblue: 0x87cefa,
      lightslategray: 0x778899,
      lightslategrey: 0x778899,
      lightsteelblue: 0xb0c4de,
      lightyellow: 0xffffe0,
      lime: 0x00ff00,
      limegreen: 0x32cd32,
      linen: 0xfaf0e6,
      magenta: 0xff00ff,
      maroon: 0x800000,
      mediumaquamarine: 0x66cdaa,
      mediumblue: 0x0000cd,
      mediumorchid: 0xba55d3,
      mediumpurple: 0x9370db,
      mediumseagreen: 0x3cb371,
      mediumslateblue: 0x7b68ee,
      mediumspringgreen: 0x00fa9a,
      mediumturquoise: 0x48d1cc,
      mediumvioletred: 0xc71585,
      midnightblue: 0x191970,
      mintcream: 0xf5fffa,
      mistyrose: 0xffe4e1,
      moccasin: 0xffe4b5,
      navajowhite: 0xffdead,
      navy: 0x000080,
      oldlace: 0xfdf5e6,
      olive: 0x808000,
      olivedrab: 0x6b8e23,
      orange: 0xffa500,
      orangered: 0xff4500,
      orchid: 0xda70d6,
      palegoldenrod: 0xeee8aa,
      palegreen: 0x98fb98,
      paleturquoise: 0xafeeee,
      palevioletred: 0xdb7093,
      papayawhip: 0xffefd5,
      peachpuff: 0xffdab9,
      peru: 0xcd853f,
      pink: 0xffc0cb,
      plum: 0xdda0dd,
      powderblue: 0xb0e0e6,
      purple: 0x800080,
      rebeccapurple: 0x663399,
      red: 0xff0000,
      rosybrown: 0xbc8f8f,
      royalblue: 0x4169e1,
      saddlebrown: 0x8b4513,
      salmon: 0xfa8072,
      sandybrown: 0xf4a460,
      seagreen: 0x2e8b57,
      seashell: 0xfff5ee,
      sienna: 0xa0522d,
      silver: 0xc0c0c0,
      skyblue: 0x87ceeb,
      slateblue: 0x6a5acd,
      slategray: 0x708090,
      slategrey: 0x708090,
      snow: 0xfffafa,
      springgreen: 0x00ff7f,
      steelblue: 0x4682b4,
      tan: 0xd2b48c,
      teal: 0x008080,
      thistle: 0xd8bfd8,
      tomato: 0xff6347,
      turquoise: 0x40e0d0,
      violet: 0xee82ee,
      wheat: 0xf5deb3,
      white: 0xffffff,
      whitesmoke: 0xf5f5f5,
      yellow: 0xffff00,
      yellowgreen: 0x9acd32
    };

    define(Color, color, {
      copy: function(channels) {
        return Object.assign(new this.constructor, this, channels);
      },
      displayable: function() {
        return this.rgb().displayable();
      },
      hex: color_formatHex, // Deprecated! Use color.formatHex.
      formatHex: color_formatHex,
      formatHsl: color_formatHsl,
      formatRgb: color_formatRgb,
      toString: color_formatRgb
    });

    function color_formatHex() {
      return this.rgb().formatHex();
    }

    function color_formatHsl() {
      return hslConvert(this).formatHsl();
    }

    function color_formatRgb() {
      return this.rgb().formatRgb();
    }

    function color(format) {
      var m, l;
      format = (format + "").trim().toLowerCase();
      return (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) // #ff0000
          : l === 3 ? new Rgb((m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf), 1) // #f00
          : l === 8 ? rgba(m >> 24 & 0xff, m >> 16 & 0xff, m >> 8 & 0xff, (m & 0xff) / 0xff) // #ff000000
          : l === 4 ? rgba((m >> 12 & 0xf) | (m >> 8 & 0xf0), (m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), (((m & 0xf) << 4) | (m & 0xf)) / 0xff) // #f000
          : null) // invalid hex
          : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
          : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
          : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
          : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
          : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
          : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
          : named.hasOwnProperty(format) ? rgbn(named[format]) // eslint-disable-line no-prototype-builtins
          : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0)
          : null;
    }

    function rgbn(n) {
      return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
    }

    function rgba(r, g, b, a) {
      if (a <= 0) r = g = b = NaN;
      return new Rgb(r, g, b, a);
    }

    function rgbConvert(o) {
      if (!(o instanceof Color)) o = color(o);
      if (!o) return new Rgb;
      o = o.rgb();
      return new Rgb(o.r, o.g, o.b, o.opacity);
    }

    function rgb(r, g, b, opacity) {
      return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
    }

    function Rgb(r, g, b, opacity) {
      this.r = +r;
      this.g = +g;
      this.b = +b;
      this.opacity = +opacity;
    }

    define(Rgb, rgb, extend(Color, {
      brighter: function(k) {
        k = k == null ? brighter : Math.pow(brighter, k);
        return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
      },
      darker: function(k) {
        k = k == null ? darker : Math.pow(darker, k);
        return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
      },
      rgb: function() {
        return this;
      },
      displayable: function() {
        return (-0.5 <= this.r && this.r < 255.5)
            && (-0.5 <= this.g && this.g < 255.5)
            && (-0.5 <= this.b && this.b < 255.5)
            && (0 <= this.opacity && this.opacity <= 1);
      },
      hex: rgb_formatHex, // Deprecated! Use color.formatHex.
      formatHex: rgb_formatHex,
      formatRgb: rgb_formatRgb,
      toString: rgb_formatRgb
    }));

    function rgb_formatHex() {
      return "#" + hex(this.r) + hex(this.g) + hex(this.b);
    }

    function rgb_formatRgb() {
      var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
      return (a === 1 ? "rgb(" : "rgba(")
          + Math.max(0, Math.min(255, Math.round(this.r) || 0)) + ", "
          + Math.max(0, Math.min(255, Math.round(this.g) || 0)) + ", "
          + Math.max(0, Math.min(255, Math.round(this.b) || 0))
          + (a === 1 ? ")" : ", " + a + ")");
    }

    function hex(value) {
      value = Math.max(0, Math.min(255, Math.round(value) || 0));
      return (value < 16 ? "0" : "") + value.toString(16);
    }

    function hsla(h, s, l, a) {
      if (a <= 0) h = s = l = NaN;
      else if (l <= 0 || l >= 1) h = s = NaN;
      else if (s <= 0) h = NaN;
      return new Hsl(h, s, l, a);
    }

    function hslConvert(o) {
      if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
      if (!(o instanceof Color)) o = color(o);
      if (!o) return new Hsl;
      if (o instanceof Hsl) return o;
      o = o.rgb();
      var r = o.r / 255,
          g = o.g / 255,
          b = o.b / 255,
          min = Math.min(r, g, b),
          max = Math.max(r, g, b),
          h = NaN,
          s = max - min,
          l = (max + min) / 2;
      if (s) {
        if (r === max) h = (g - b) / s + (g < b) * 6;
        else if (g === max) h = (b - r) / s + 2;
        else h = (r - g) / s + 4;
        s /= l < 0.5 ? max + min : 2 - max - min;
        h *= 60;
      } else {
        s = l > 0 && l < 1 ? 0 : h;
      }
      return new Hsl(h, s, l, o.opacity);
    }

    function hsl(h, s, l, opacity) {
      return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
    }

    function Hsl(h, s, l, opacity) {
      this.h = +h;
      this.s = +s;
      this.l = +l;
      this.opacity = +opacity;
    }

    define(Hsl, hsl, extend(Color, {
      brighter: function(k) {
        k = k == null ? brighter : Math.pow(brighter, k);
        return new Hsl(this.h, this.s, this.l * k, this.opacity);
      },
      darker: function(k) {
        k = k == null ? darker : Math.pow(darker, k);
        return new Hsl(this.h, this.s, this.l * k, this.opacity);
      },
      rgb: function() {
        var h = this.h % 360 + (this.h < 0) * 360,
            s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
            l = this.l,
            m2 = l + (l < 0.5 ? l : 1 - l) * s,
            m1 = 2 * l - m2;
        return new Rgb(
          hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
          hsl2rgb(h, m1, m2),
          hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
          this.opacity
        );
      },
      displayable: function() {
        return (0 <= this.s && this.s <= 1 || isNaN(this.s))
            && (0 <= this.l && this.l <= 1)
            && (0 <= this.opacity && this.opacity <= 1);
      },
      formatHsl: function() {
        var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
        return (a === 1 ? "hsl(" : "hsla(")
            + (this.h || 0) + ", "
            + (this.s || 0) * 100 + "%, "
            + (this.l || 0) * 100 + "%"
            + (a === 1 ? ")" : ", " + a + ")");
      }
    }));

    /* From FvD 13.37, CSS Color Module Level 3 */
    function hsl2rgb(h, m1, m2) {
      return (h < 60 ? m1 + (m2 - m1) * h / 60
          : h < 180 ? m2
          : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
          : m1) * 255;
    }

    function faviconEmoji(icon, color$1) {
      let solver, filter;

      class Color {
        constructor(r, g, b) {
          this.set(r, g, b);
        }
        
        toString() {
          return `rgb(${Math.round(this.r)}, ${Math.round(this.g)}, ${Math.round(this.b)})`;
        }
      
        set(r, g, b) {
          this.r = this.clamp(r);
          this.g = this.clamp(g);
          this.b = this.clamp(b);
        }
      
        hueRotate(angle = 0) {
          angle = angle / 180 * Math.PI;
          const sin = Math.sin(angle);
          const cos = Math.cos(angle);
      
          this.multiply([
            0.213 + cos * 0.787 - sin * 0.213,
            0.715 - cos * 0.715 - sin * 0.715,
            0.072 - cos * 0.072 + sin * 0.928,
            0.213 - cos * 0.213 + sin * 0.143,
            0.715 + cos * 0.285 + sin * 0.140,
            0.072 - cos * 0.072 - sin * 0.283,
            0.213 - cos * 0.213 - sin * 0.787,
            0.715 - cos * 0.715 + sin * 0.715,
            0.072 + cos * 0.928 + sin * 0.072,
          ]);
        }
      
        grayscale(value = 1) {
          this.multiply([
            0.2126 + 0.7874 * (1 - value),
            0.7152 - 0.7152 * (1 - value),
            0.0722 - 0.0722 * (1 - value),
            0.2126 - 0.2126 * (1 - value),
            0.7152 + 0.2848 * (1 - value),
            0.0722 - 0.0722 * (1 - value),
            0.2126 - 0.2126 * (1 - value),
            0.7152 - 0.7152 * (1 - value),
            0.0722 + 0.9278 * (1 - value),
          ]);
        }
      
        sepia(value = 1) {
          this.multiply([
            0.393 + 0.607 * (1 - value),
            0.769 - 0.769 * (1 - value),
            0.189 - 0.189 * (1 - value),
            0.349 - 0.349 * (1 - value),
            0.686 + 0.314 * (1 - value),
            0.168 - 0.168 * (1 - value),
            0.272 - 0.272 * (1 - value),
            0.534 - 0.534 * (1 - value),
            0.131 + 0.869 * (1 - value),
          ]);
        }
      
        saturate(value = 1) {
          this.multiply([
            0.213 + 0.787 * value,
            0.715 - 0.715 * value,
            0.072 - 0.072 * value,
            0.213 - 0.213 * value,
            0.715 + 0.285 * value,
            0.072 - 0.072 * value,
            0.213 - 0.213 * value,
            0.715 - 0.715 * value,
            0.072 + 0.928 * value,
          ]);
        }
      
        multiply(matrix) {
          const newR = this.clamp(this.r * matrix[0] + this.g * matrix[1] + this.b * matrix[2]);
          const newG = this.clamp(this.r * matrix[3] + this.g * matrix[4] + this.b * matrix[5]);
          const newB = this.clamp(this.r * matrix[6] + this.g * matrix[7] + this.b * matrix[8]);
          this.r = newR;
          this.g = newG;
          this.b = newB;
        }
      
        brightness(value = 1) {
          this.linear(value);
        }
        contrast(value = 1) {
          this.linear(value, -(0.5 * value) + 0.5);
        }
      
        linear(slope = 1, intercept = 0) {
          this.r = this.clamp(this.r * slope + intercept * 255);
          this.g = this.clamp(this.g * slope + intercept * 255);
          this.b = this.clamp(this.b * slope + intercept * 255);
        }
      
        invert(value = 1) {
          this.r = this.clamp((value + this.r / 255 * (1 - 2 * value)) * 255);
          this.g = this.clamp((value + this.g / 255 * (1 - 2 * value)) * 255);
          this.b = this.clamp((value + this.b / 255 * (1 - 2 * value)) * 255);
        }
      
        hsl() {
          // Code taken from https://stackoverflow.com/a/9493060/2688027, licensed under CC BY-SA.
          const r = this.r / 255;
          const g = this.g / 255;
          const b = this.b / 255;
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          let h, s, l = (max + min) / 2;
      
          if (max === min) {
            h = s = 0;
          } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
              case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
      
              case g:
                h = (b - r) / d + 2;
                break;
      
              case b:
                h = (r - g) / d + 4;
                break;
            }
            h /= 6;
          }
      
          return {
            h: h * 100,
            s: s * 100,
            l: l * 100,
          };
        }
      
        clamp(value) {
          if (value > 255) {
            value = 255;
          } else if (value < 0) {
            value = 0;
          }
          return value;
        }
      }
      
      class Solver {
        constructor(target, baseColor) {
          this.target = target;
          this.targetHSL = target.hsl();
          this.reusedColor = new Color(0, 0, 0);
        }
      
        solve() {
          const result = this.solveNarrow(this.solveWide());
          return {
            values: result.values,
            loss: result.loss,
            filter: this.css(result.values),
          };
        }
      
        solveWide() {
          const A = 5;
          const c = 15;
          const a = [60, 180, 18000, 600, 1.2, 1.2];
      
          let best = { loss: Infinity };
          for (let i = 0; best.loss > 25 && i < 3; i++) {
            const initial = [50, 20, 3750, 50, 100, 100];
            const result = this.spsa(A, a, c, initial, 1000);
            if (result.loss < best.loss) {
              best = result;
            }
          }
          return best;
        }
      
        solveNarrow(wide) {
          const A = wide.loss;
          const c = 2;
          const A1 = A + 1;
          const a = [0.25 * A1, 0.25 * A1, A1, 0.25 * A1, 0.2 * A1, 0.2 * A1];
          return this.spsa(A, a, c, wide.values, 500);
        }
      
        spsa(A, a, c, values, iters) {
          const alpha = 1;
          const gamma = 0.16666666666666666;
      
          let best = null;
          let bestLoss = Infinity;
          const deltas = new Array(6);
          const highArgs = new Array(6);
          const lowArgs = new Array(6);
      
          for (let k = 0; k < iters; k++) {
            const ck = c / Math.pow(k + 1, gamma);
            for (let i = 0; i < 6; i++) {
              deltas[i] = Math.random() > 0.5 ? 1 : -1;
              highArgs[i] = values[i] + ck * deltas[i];
              lowArgs[i] = values[i] - ck * deltas[i];
            }
      
            const lossDiff = this.loss(highArgs) - this.loss(lowArgs);
            for (let i = 0; i < 6; i++) {
              const g = lossDiff / (2 * ck) * deltas[i];
              const ak = a[i] / Math.pow(A + k + 1, alpha);
              values[i] = fix(values[i] - ak * g, i);
            }
      
            const loss = this.loss(values);
            if (loss < bestLoss) {
              best = values.slice(0);
              bestLoss = loss;
            }
          }
          return { values: best, loss: bestLoss };
      
          function fix(value, idx) {
            let max = 100;
            if (idx === 2 /* saturate */) {
              max = 7500;
            } else if (idx === 4 /* brightness */ || idx === 5 /* contrast */) {
              max = 200;
            }
      
            if (idx === 3 /* hue-rotate */) {
              if (value > max) {
                value %= max;
              } else if (value < 0) {
                value = max + value % max;
              }
            } else if (value < 0) {
              value = 0;
            } else if (value > max) {
              value = max;
            }
            return value;
          }
        }
      
        loss(filters) {
          // Argument is array of percentages.
          const color = this.reusedColor;
          color.set(0, 0, 0);
      
          color.invert(filters[0] / 100);
          color.sepia(filters[1] / 100);
          color.saturate(filters[2] / 100);
          color.hueRotate(filters[3] * 3.6);
          color.brightness(filters[4] / 100);
          color.contrast(filters[5] / 100);
      
          const colorHSL = color.hsl();
          return (
            Math.abs(color.r - this.target.r) +
            Math.abs(color.g - this.target.g) +
            Math.abs(color.b - this.target.b) +
            Math.abs(colorHSL.h - this.targetHSL.h) +
            Math.abs(colorHSL.s - this.targetHSL.s) +
            Math.abs(colorHSL.l - this.targetHSL.l)
          );
        }
      
        css(filters) {
          function fmt(idx, multiplier = 1) {
            return Math.round(filters[idx] * multiplier);
          }
          return `filter: brightness(0%) invert(${fmt(0)}%) sepia(${fmt(1)}%) saturate(${fmt(2)}%) hue-rotate(${fmt(3, 3.6)}deg) brightness(${fmt(4)}%) contrast(${fmt(5)}%);`;
        }
      }
      
      if (color$1) {
        color$1 = color(color$1);
        color$1 = new Color(color$1.r, color$1.g, color$1.b);
        solver = new Solver(color$1);
        filter = solver.solve().filter;
      } else {
        filter = 'filter: invert(0.5) brightness(2)';
      }

      return encodeURI(`data:image/svg+xml,
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <style>
        text { ${filter} }
      </style>
      <text class="test" x="2" y=".85em" font-size="95">
        ${icon}
      </text>
    </svg>
  ` .split('\n')
        .map(l => l.trim())
        .join('')
      );
    }

    var components = [
    	{
    		name: "P",
    		tag: "p--"
    	}
    ];
    var library = {
    	components: components
    };

    var library$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        components: components,
        'default': library
    });

    /* src/html/Head.svelte generated by Svelte v3.23.2 */
    const file = "src/html/Head.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (19:2) {#each components.map(component => `/lib/${component.name}.js`) as src}
    function create_each_block(ctx) {
    	let script;
    	let script_src_value;

    	const block = {
    		c: function create() {
    			script = element("script");
    			attr_dev(script, "type", "module");
    			if (script.src !== (script_src_value = /*src*/ ctx[3])) attr_dev(script, "src", script_src_value);
    			add_location(script, file, 19, 4, 495);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, script, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(script);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(19:2) {#each components.map(component => `/lib/${component.name}.js`) as src}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let title_value;
    	let link;
    	let link_href_value;
    	let each_1_anchor;
    	document.title = title_value = /*title*/ ctx[1];
    	let each_value = /*components*/ ctx[0].map(func);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			link = element("link");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr_dev(link, "rel", "icon");
    			attr_dev(link, "href", link_href_value = faviconEmoji(.../*icon*/ ctx[2]));
    			add_location(link, file, 16, 2, 367);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, link);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(document.head, null);
    			}

    			append_dev(document.head, each_1_anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*title*/ 2 && title_value !== (title_value = /*title*/ ctx[1])) {
    				document.title = title_value;
    			}

    			if (dirty & /*components*/ 1) {
    				each_value = /*components*/ ctx[0].map(func);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			detach_dev(link);
    			destroy_each(each_blocks, detaching);
    			detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const func = component => `/lib/${component.name}.js`;

    function instance($$self, $$props, $$invalidate) {
    	const { components } = library$1;
    	let title = "Scaffold";
    	var icon = ["⛩", "rgb(82,139,247)"];

    	if (!localStorage.getItem("fj_token")) {
    		localStorage.setItem("fj_token", "tjXrdHRxiiRAR-StjXJDrA");
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Head> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Head", $$slots, []);

    	$$self.$capture_state = () => ({
    		faviconEmoji,
    		library: library$1,
    		components,
    		title,
    		icon
    	});

    	$$self.$inject_state = $$props => {
    		if ("title" in $$props) $$invalidate(1, title = $$props.title);
    		if ("icon" in $$props) $$invalidate(2, icon = $$props.icon);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [components, title, icon];
    }

    class Head extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Head",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src/html/App.svelte generated by Svelte v3.23.2 */
    const file$1 = "src/html/App.svelte";

    function create_fragment$1(ctx) {
    	let head;
    	let t0;
    	let p__;
    	let current;
    	head = new Head({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(head.$$.fragment);
    			t0 = space();
    			p__ = element("p--");
    			p__.textContent = "Hello. My name is $nameFirst $nameLast.";
    			add_location(p__, file$1, 6, 0, 66);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(head, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, p__, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(head.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(head.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(head, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(p__);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	$$self.$capture_state = () => ({ Head });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function unwrapExports (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var emotion_umd_min = createCommonjsModule(function (module, exports) {
    !function(e,r){r(exports);}(commonjsGlobal,function(e){var r=function(){function e(e){this.isSpeedy=void 0===e.speedy||e.speedy,this.tags=[],this.ctr=0,this.nonce=e.nonce,this.key=e.key,this.container=e.container,this.before=null;}var r=e.prototype;return r.insert=function(e){if(this.ctr%(this.isSpeedy?65e3:1)==0){var r,t=function(e){var r=document.createElement("style");return r.setAttribute("data-emotion",e.key),void 0!==e.nonce&&r.setAttribute("nonce",e.nonce),r.appendChild(document.createTextNode("")),r}(this);r=0===this.tags.length?this.before:this.tags[this.tags.length-1].nextSibling,this.container.insertBefore(t,r),this.tags.push(t);}var a=this.tags[this.tags.length-1];if(this.isSpeedy){var n=function(e){if(e.sheet)return e.sheet;for(var r=0;r<document.styleSheets.length;r++)if(document.styleSheets[r].ownerNode===e)return document.styleSheets[r]}(a);try{var i=105===e.charCodeAt(1)&&64===e.charCodeAt(0);n.insertRule(e,i?0:n.cssRules.length);}catch(e){}}else a.appendChild(document.createTextNode(e));this.ctr++;},r.flush=function(){this.tags.forEach(function(e){return e.parentNode.removeChild(e)}),this.tags=[],this.ctr=0;},e}();function t(e){function r(e,r,a){var n=r.trim().split(b);r=n;var i=n.length,s=e.length;switch(s){case 0:case 1:var c=0;for(e=0===s?"":e[0]+" ";c<i;++c)r[c]=t(e,r[c],a).trim();break;default:var o=c=0;for(r=[];c<i;++c)for(var l=0;l<s;++l)r[o++]=t(e[l]+" ",n[c],a).trim();}return r}function t(e,r,t){var a=r.charCodeAt(0);switch(33>a&&(a=(r=r.trim()).charCodeAt(0)),a){case 38:return r.replace(g,"$1"+e.trim());case 58:return e.trim()+r.replace(g,"$1"+e.trim());default:if(0<1*t&&0<r.indexOf("\f"))return r.replace(g,(58===e.charCodeAt(0)?"":"$1")+e.trim())}return e+r}function a(e,r,t,i){var s=e+";",c=2*r+3*t+4*i;if(944===c){e=s.indexOf(":",9)+1;var o=s.substring(e,s.length-1).trim();return o=s.substring(0,e).trim()+o+";",1===z||2===z&&n(o,1)?"-webkit-"+o+o:o}if(0===z||2===z&&!n(s,1))return s;switch(c){case 1015:return 97===s.charCodeAt(10)?"-webkit-"+s+s:s;case 951:return 116===s.charCodeAt(3)?"-webkit-"+s+s:s;case 963:return 110===s.charCodeAt(5)?"-webkit-"+s+s:s;case 1009:if(100!==s.charCodeAt(4))break;case 969:case 942:return "-webkit-"+s+s;case 978:return "-webkit-"+s+"-moz-"+s+s;case 1019:case 983:return "-webkit-"+s+"-moz-"+s+"-ms-"+s+s;case 883:if(45===s.charCodeAt(8))return "-webkit-"+s+s;if(0<s.indexOf("image-set(",11))return s.replace(S,"$1-webkit-$2")+s;break;case 932:if(45===s.charCodeAt(4))switch(s.charCodeAt(5)){case 103:return "-webkit-box-"+s.replace("-grow","")+"-webkit-"+s+"-ms-"+s.replace("grow","positive")+s;case 115:return "-webkit-"+s+"-ms-"+s.replace("shrink","negative")+s;case 98:return "-webkit-"+s+"-ms-"+s.replace("basis","preferred-size")+s}return "-webkit-"+s+"-ms-"+s+s;case 964:return "-webkit-"+s+"-ms-flex-"+s+s;case 1023:if(99!==s.charCodeAt(8))break;return "-webkit-box-pack"+(o=s.substring(s.indexOf(":",15)).replace("flex-","").replace("space-between","justify"))+"-webkit-"+s+"-ms-flex-pack"+o+s;case 1005:return d.test(s)?s.replace(u,":-webkit-")+s.replace(u,":-moz-")+s:s;case 1e3:switch(r=(o=s.substring(13).trim()).indexOf("-")+1,o.charCodeAt(0)+o.charCodeAt(r)){case 226:o=s.replace(v,"tb");break;case 232:o=s.replace(v,"tb-rl");break;case 220:o=s.replace(v,"lr");break;default:return s}return "-webkit-"+s+"-ms-"+o+s;case 1017:if(-1===s.indexOf("sticky",9))break;case 975:switch(r=(s=e).length-10,c=(o=(33===s.charCodeAt(r)?s.substring(0,r):s).substring(e.indexOf(":",7)+1).trim()).charCodeAt(0)+(0|o.charCodeAt(7))){case 203:if(111>o.charCodeAt(8))break;case 115:s=s.replace(o,"-webkit-"+o)+";"+s;break;case 207:case 102:s=s.replace(o,"-webkit-"+(102<c?"inline-":"")+"box")+";"+s.replace(o,"-webkit-"+o)+";"+s.replace(o,"-ms-"+o+"box")+";"+s;}return s+";";case 938:if(45===s.charCodeAt(5))switch(s.charCodeAt(6)){case 105:return o=s.replace("-items",""),"-webkit-"+s+"-webkit-box-"+o+"-ms-flex-"+o+s;case 115:return "-webkit-"+s+"-ms-flex-item-"+s.replace(A,"")+s;default:return "-webkit-"+s+"-ms-flex-line-pack"+s.replace("align-content","").replace(A,"")+s}break;case 973:case 989:if(45!==s.charCodeAt(3)||122===s.charCodeAt(4))break;case 931:case 953:if(!0===x.test(e))return 115===(o=e.substring(e.indexOf(":")+1)).charCodeAt(0)?a(e.replace("stretch","fill-available"),r,t,i).replace(":fill-available",":stretch"):s.replace(o,"-webkit-"+o)+s.replace(o,"-moz-"+o.replace("fill-",""))+s;break;case 962:if(s="-webkit-"+s+(102===s.charCodeAt(5)?"-ms-"+s:"")+s,211===t+i&&105===s.charCodeAt(13)&&0<s.indexOf("transform",10))return s.substring(0,s.indexOf(";",27)+1).replace(h,"$1-webkit-$2")+s}return s}function n(e,r){var t=e.indexOf(1===r?":":"{"),a=e.substring(0,3!==r?t:10);return t=e.substring(t+1,e.length-1),G(2!==r?a:a.replace(C,"$1"),t,r)}function i(e,r){var t=a(r,r.charCodeAt(0),r.charCodeAt(1),r.charCodeAt(2));return t!==r+";"?t.replace(y," or ($1)").substring(4):"("+r+")"}function s(e,r,t,a,n,i,s,c,l,f){for(var u,d=0,h=r;d<_;++d)switch(u=R[d].call(o,e,h,t,a,n,i,s,c,l,f)){case void 0:case!1:case!0:case null:break;default:h=u;}if(h!==r)return h}function c(e){return void 0!==(e=e.prefix)&&(G=null,e?"function"!=typeof e?z=1:(z=2,G=e):z=0),c}function o(e,t){var c=e;if(33>c.charCodeAt(0)&&(c=c.trim()),c=[c],0<_){var o=s(-1,t,c,c,$,O,0,0,0,0);void 0!==o&&"string"==typeof o&&(t=o);}var u=function e(t,c,o,u,d){for(var h,b,g,v,y,A=0,C=0,x=0,S=0,R=0,G=0,I=g=h=0,M=0,W=0,P=0,D=0,F=o.length,L=F-1,T="",q="",B="",H="";M<F;){if(b=o.charCodeAt(M),M===L&&0!==C+S+x+A&&(0!==C&&(b=47===C?10:47),S=x=A=0,F++,L++),0===C+S+x+A){if(M===L&&(0<W&&(T=T.replace(f,"")),0<T.trim().length)){switch(b){case 32:case 9:case 59:case 13:case 10:break;default:T+=o.charAt(M);}b=59;}switch(b){case 123:for(h=(T=T.trim()).charCodeAt(0),g=1,D=++M;M<F;){switch(b=o.charCodeAt(M)){case 123:g++;break;case 125:g--;break;case 47:switch(b=o.charCodeAt(M+1)){case 42:case 47:e:{for(I=M+1;I<L;++I)switch(o.charCodeAt(I)){case 47:if(42===b&&42===o.charCodeAt(I-1)&&M+2!==I){M=I+1;break e}break;case 10:if(47===b){M=I+1;break e}}M=I;}}break;case 91:b++;case 40:b++;case 34:case 39:for(;M++<L&&o.charCodeAt(M)!==b;);}if(0===g)break;M++;}switch(g=o.substring(D,M),0===h&&(h=(T=T.replace(l,"").trim()).charCodeAt(0)),h){case 64:switch(0<W&&(T=T.replace(f,"")),b=T.charCodeAt(1)){case 100:case 109:case 115:case 45:W=c;break;default:W=E;}if(D=(g=e(c,W,g,b,d+1)).length,0<_&&(y=s(3,g,W=r(E,T,P),c,$,O,D,b,d,u),T=W.join(""),void 0!==y&&0===(D=(g=y.trim()).length)&&(b=0,g="")),0<D)switch(b){case 115:T=T.replace(w,i);case 100:case 109:case 45:g=T+"{"+g+"}";break;case 107:g=(T=T.replace(p,"$1 $2"))+"{"+g+"}",g=1===z||2===z&&n("@"+g,3)?"@-webkit-"+g+"@"+g:"@"+g;break;default:g=T+g,112===u&&(q+=g,g="");}else g="";break;default:g=e(c,r(c,T,P),g,u,d+1);}B+=g,g=P=W=I=h=0,T="",b=o.charCodeAt(++M);break;case 125:case 59:if(1<(D=(T=(0<W?T.replace(f,""):T).trim()).length))switch(0===I&&(h=T.charCodeAt(0),45===h||96<h&&123>h)&&(D=(T=T.replace(" ",":")).length),0<_&&void 0!==(y=s(1,T,c,t,$,O,q.length,u,d,u))&&0===(D=(T=y.trim()).length)&&(T="\0\0"),h=T.charCodeAt(0),b=T.charCodeAt(1),h){case 0:break;case 64:if(105===b||99===b){H+=T+o.charAt(M);break}default:58!==T.charCodeAt(D-1)&&(q+=a(T,h,b,T.charCodeAt(2)));}P=W=I=h=0,T="",b=o.charCodeAt(++M);}}switch(b){case 13:case 10:47===C?C=0:0===1+h&&107!==u&&0<T.length&&(W=1,T+="\0"),0<_*N&&s(0,T,c,t,$,O,q.length,u,d,u),O=1,$++;break;case 59:case 125:if(0===C+S+x+A){O++;break}default:switch(O++,v=o.charAt(M),b){case 9:case 32:if(0===S+A+C)switch(R){case 44:case 58:case 9:case 32:v="";break;default:32!==b&&(v=" ");}break;case 0:v="\\0";break;case 12:v="\\f";break;case 11:v="\\v";break;case 38:0===S+C+A&&(W=P=1,v="\f"+v);break;case 108:if(0===S+C+A+j&&0<I)switch(M-I){case 2:112===R&&58===o.charCodeAt(M-3)&&(j=R);case 8:111===G&&(j=G);}break;case 58:0===S+C+A&&(I=M);break;case 44:0===C+x+S+A&&(W=1,v+="\r");break;case 34:case 39:0===C&&(S=S===b?0:0===S?b:S);break;case 91:0===S+C+x&&A++;break;case 93:0===S+C+x&&A--;break;case 41:0===S+C+A&&x--;break;case 40:if(0===S+C+A){if(0===h)switch(2*R+3*G){case 533:break;default:h=1;}x++;}break;case 64:0===C+x+S+A+I+g&&(g=1);break;case 42:case 47:if(!(0<S+A+x))switch(C){case 0:switch(2*b+3*o.charCodeAt(M+1)){case 235:C=47;break;case 220:D=M,C=42;}break;case 42:47===b&&42===R&&D+2!==M&&(33===o.charCodeAt(D+2)&&(q+=o.substring(D,M+1)),v="",C=0);}}0===C&&(T+=v);}G=R,R=b,M++;}if(0<(D=q.length)){if(W=c,0<_&&void 0!==(y=s(2,q,W,t,$,O,D,u,d,u))&&0===(q=y).length)return H+q+B;if(q=W.join(",")+"{"+q+"}",0!=z*j){switch(2!==z||n(q,2)||(j=0),j){case 111:q=q.replace(k,":-moz-$1")+q;break;case 112:q=q.replace(m,"::-webkit-input-$1")+q.replace(m,"::-moz-$1")+q.replace(m,":-ms-input-$1")+q;}j=0;}}return H+q+B}(E,c,t,0,0);return 0<_&&(void 0!==(o=s(-2,u,c,c,$,O,u.length,0,0,0))&&(u=o)),j=0,O=$=1,u}var l=/^\0+/g,f=/[\0\r\f]/g,u=/: */g,d=/zoo|gra/,h=/([,: ])(transform)/g,b=/,\r+?/g,g=/([\t\r\n ])*\f?&/g,p=/@(k\w+)\s*(\S*)\s*/,m=/::(place)/g,k=/:(read-only)/g,v=/[svh]\w+-[tblr]{2}/,w=/\(\s*(.*)\s*\)/g,y=/([\s\S]*?);/g,A=/-self|flex-/g,C=/[^]*?(:[rp][el]a[\w-]+)[^]*/,x=/stretch|:\s*\w+\-(?:conte|avail)/,S=/([^-])(image-set\()/,O=1,$=1,j=0,z=1,E=[],R=[],_=0,G=null,N=0;return o.use=function e(r){switch(r){case void 0:case null:_=R.length=0;break;default:if("function"==typeof r)R[_++]=r;else if("object"==typeof r)for(var t=0,a=r.length;t<a;++t)e(r[t]);else N=0|!!r;}return e},o.set=c,void 0!==e&&c(e),o}function a(e){e&&n.current.insert(e+"}");}var n={current:null},i=function(e,r,t,i,s,c,o,l,f,u){switch(e){case 1:switch(r.charCodeAt(0)){case 64:return n.current.insert(r+";"),"";case 108:if(98===r.charCodeAt(2))return ""}break;case 2:if(0===l)return r+"/*|*/";break;case 3:switch(l){case 102:case 112:return n.current.insert(t[0]+r),"";default:return r+(0===u?"/*|*/":"")}case-2:r.split("/*|*/}").forEach(a);}};var s={animationIterationCount:1,borderImageOutset:1,borderImageSlice:1,borderImageWidth:1,boxFlex:1,boxFlexGroup:1,boxOrdinalGroup:1,columnCount:1,columns:1,flex:1,flexGrow:1,flexPositive:1,flexShrink:1,flexNegative:1,flexOrder:1,gridRow:1,gridRowEnd:1,gridRowSpan:1,gridRowStart:1,gridColumn:1,gridColumnEnd:1,gridColumnSpan:1,gridColumnStart:1,msGridRow:1,msGridRowSpan:1,msGridColumn:1,msGridColumnSpan:1,fontWeight:1,lineHeight:1,opacity:1,order:1,orphans:1,tabSize:1,widows:1,zIndex:1,zoom:1,WebkitLineClamp:1,fillOpacity:1,floodOpacity:1,stopOpacity:1,strokeDasharray:1,strokeDashoffset:1,strokeMiterlimit:1,strokeOpacity:1,strokeWidth:1};var c=/[A-Z]|^ms/g,o=/_EMO_([^_]+?)_([^]*?)_EMO_/g,l=function(e){return 45===e.charCodeAt(1)},f=function(e){return null!=e&&"boolean"!=typeof e},u=function(e){var r={};return function(t){return void 0===r[t]&&(r[t]=e(t)),r[t]}}(function(e){return l(e)?e:e.replace(c,"-$&").toLowerCase()}),d=function(e,r){switch(e){case"animation":case"animationName":if("string"==typeof r)return r.replace(o,function(e,r,t){return b={name:r,styles:t,next:b},r})}return 1===s[e]||l(e)||"number"!=typeof r||0===r?r:r+"px"};function h(e,r,t,a){if(null==t)return "";if(void 0!==t.__emotion_styles)return t;switch(typeof t){case"boolean":return "";case"object":if(1===t.anim)return b={name:t.name,styles:t.styles,next:b},t.name;if(void 0!==t.styles){var n=t.next;if(void 0!==n)for(;void 0!==n;)b={name:n.name,styles:n.styles,next:b},n=n.next;return t.styles+";"}return function(e,r,t){var a="";if(Array.isArray(t))for(var n=0;n<t.length;n++)a+=h(e,r,t[n],!1);else for(var i in t){var s=t[i];if("object"!=typeof s)null!=r&&void 0!==r[s]?a+=i+"{"+r[s]+"}":f(s)&&(a+=u(i)+":"+d(i,s)+";");else if(!Array.isArray(s)||"string"!=typeof s[0]||null!=r&&void 0!==r[s[0]]){var c=h(e,r,s,!1);switch(i){case"animation":case"animationName":a+=u(i)+":"+c+";";break;default:a+=i+"{"+c+"}";}}else for(var o=0;o<s.length;o++)f(s[o])&&(a+=u(i)+":"+d(i,s[o])+";");}return a}(e,r,t);case"function":if(void 0!==e){var i=b,s=t(e);return b=i,h(e,r,s,a)}}if(null==r)return t;var c=r[t];return void 0===c||a?t:c}var b,g=/label:\s*([^\s;\n{]+)\s*;/g,p=function(e,r,t){if(1===e.length&&"object"==typeof e[0]&&null!==e[0]&&void 0!==e[0].styles)return e[0];var a=!0,n="";b=void 0;var i=e[0];null==i||void 0===i.raw?(a=!1,n+=h(t,r,i,!1)):n+=i[0];for(var s=1;s<e.length;s++)n+=h(t,r,e[s],46===n.charCodeAt(n.length-1)),a&&(n+=i[s]);g.lastIndex=0;for(var c,o="";null!==(c=g.exec(n));)o+="-"+c[1];return {name:function(e){for(var r,t=e.length,a=t^t,n=0;t>=4;)r=1540483477*(65535&(r=255&e.charCodeAt(n)|(255&e.charCodeAt(++n))<<8|(255&e.charCodeAt(++n))<<16|(255&e.charCodeAt(++n))<<24))+((1540483477*(r>>>16)&65535)<<16),a=1540483477*(65535&a)+((1540483477*(a>>>16)&65535)<<16)^(r=1540483477*(65535&(r^=r>>>24))+((1540483477*(r>>>16)&65535)<<16)),t-=4,++n;switch(t){case 3:a^=(255&e.charCodeAt(n+2))<<16;case 2:a^=(255&e.charCodeAt(n+1))<<8;case 1:a=1540483477*(65535&(a^=255&e.charCodeAt(n)))+((1540483477*(a>>>16)&65535)<<16);}return a=1540483477*(65535&(a^=a>>>13))+((1540483477*(a>>>16)&65535)<<16),((a^=a>>>15)>>>0).toString(36)}(n)+o,styles:n,next:b}};function m(e,r,t){var a="";return t.split(" ").forEach(function(t){void 0!==e[t]?r.push(e[t]):a+=t+" ";}),a}function k(e,r){if(void 0===e.inserted[r.name])return e.insert("",r,e.sheet,!0)}function v(e,r,t){var a=[],n=m(e,a,t);return a.length<2?t:n+r(a)}var w=function e(r){for(var t="",a=0;a<r.length;a++){var n=r[a];if(null!=n){var i=void 0;switch(typeof n){case"boolean":break;case"object":if(Array.isArray(n))i=e(n);else for(var s in i="",n)n[s]&&s&&(i&&(i+=" "),i+=s);break;default:i=n;}i&&(t&&(t+=" "),t+=i);}}return t},y=function(e){var a=function(e){void 0===e&&(e={});var a,s=e.key||"css";void 0!==e.prefix&&(a={prefix:e.prefix});var c,o=new t(a),l={};c=e.container||document.head;var f,u=document.querySelectorAll("style[data-emotion-"+s+"]");Array.prototype.forEach.call(u,function(e){e.getAttribute("data-emotion-"+s).split(" ").forEach(function(e){l[e]=!0;}),e.parentNode!==c&&c.appendChild(e);}),o.use(e.stylisPlugins)(i),f=function(e,r,t,a){var i=r.name;n.current=t,o(e,r.styles),a&&(d.inserted[i]=!0);};var d={key:s,sheet:new r({key:s,container:c,nonce:e.nonce,speedy:e.speedy}),nonce:e.nonce,inserted:l,registered:{},insert:f};return d}(e);a.sheet.speedy=function(e){this.isSpeedy=e;},a.compat=!0;var s=function(){for(var e=arguments.length,r=new Array(e),t=0;t<e;t++)r[t]=arguments[t];var n=p(r,a.registered,void 0);return function(e,r,t){var a=e.key+"-"+r.name;if(!1===t&&void 0===e.registered[a]&&(e.registered[a]=r.styles),void 0===e.inserted[r.name]){var n=r;do{e.insert("."+a,n,e.sheet,!0),n=n.next;}while(void 0!==n)}}(a,n,!1),a.key+"-"+n.name};return {css:s,cx:function(){for(var e=arguments.length,r=new Array(e),t=0;t<e;t++)r[t]=arguments[t];return v(a.registered,s,w(r))},injectGlobal:function(){for(var e=arguments.length,r=new Array(e),t=0;t<e;t++)r[t]=arguments[t];var n=p(r,a.registered);k(a,n);},keyframes:function(){for(var e=arguments.length,r=new Array(e),t=0;t<e;t++)r[t]=arguments[t];var n=p(r,a.registered),i="animation-"+n.name;return k(a,{name:n.name,styles:"@keyframes "+i+"{"+n.styles+"}"}),i},hydrate:function(e){e.forEach(function(e){a.inserted[e]=!0;});},flush:function(){a.registered={},a.inserted={},a.sheet.flush();},sheet:a.sheet,cache:a,getRegisteredStyles:m.bind(null,a.registered),merge:v.bind(null,a.registered,s)}}(),A=y.flush,C=y.hydrate,x=y.cx,S=y.merge,O=y.getRegisteredStyles,$=y.injectGlobal,j=y.keyframes,z=y.css,E=y.sheet,R=y.cache;e.cache=R,e.css=z,e.cx=x,e.flush=A,e.getRegisteredStyles=O,e.hydrate=C,e.injectGlobal=$,e.keyframes=j,e.merge=S,e.sheet=E,Object.defineProperty(e,"__esModule",{value:!0});});
    //# sourceMappingURL=emotion.umd.min.js.map
    });

    var emotion = unwrapExports(emotion_umd_min);

    let css = css => css;
    var Core = css`

  html {
    font-size: var(--fs);
    font: var(--font);
    color: var(--sec);
    background-color: var(--qui);
  }

  body {
    padding: var(--s2);
  }
  
`;

    let css$1 = css => css;
    var Fonts = css$1`

  @font-face {
    font-family: defff;
    font-style: normal;
    font-weight: 700;
    font-display: swap;
    src: url("/fonts/GraphikLCG-Bold.otf") format("opentype");
  }

  @font-face {
    font-family: defff;
    font-style: italic;
    font-weight: 700;
    font-display: swap;
    src: url("/fonts/GraphikLCG-BoldItalic.otf") format("opentype");
  }

  @font-face {
    font-family: defff;
    font-style: normal;
    font-weight: 600;
    font-display: swap;
    src: url("/fonts/GraphikLCG-Semibold.otf") format("opentype");
  }

  @font-face {
    font-family: defff;
    font-style: italic;
    font-weight: 600;
    font-display: swap;
    src: url("/fonts/GraphikLCG-SemiboldItalic.otf") format("opentype");
  }

  @font-face {
    font-family: defff;
    font-style: normal;
    font-weight: 500;
    font-display: swap;
    src: url("/fonts/GraphikLCG-Medium.otf") format("opentype");
  }

  @font-face {
    font-family: defff;
    font-style: italic;
    font-weight: 500;
    font-display: swap;
    src: url("/fonts/GraphikLCG-MediumItalic.otf") format("opentype");
  }

  @font-face {
    font-family: defff;
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: url("/fonts/GraphikLCG-Regular.otf") format("opentype");
  }

  @font-face {
    font-family: defff;
    font-style: italic;
    font-weight: 400;
    font-display: swap;
    src: url("/fonts/GraphikLCG-RegularItalic.otf") format("opentype");
  }

`;

    let css$2 = css => css;
    var Reset = css$2`

  * {
    -webkit-font-smoothing: inherit;
    -moz-osx-font-smoothing: inherit;
    -webkit-appearance: none;
    font: inherit;
    cursor: inherit;
    font-weight: inherit;
    font-synthesis: none;
    list-style: none;
    color: currentColor;
    margin: 0;
    padding: 0;
    border: 0 solid;
  }

  *, *:before, *:after {
    box-sizing: inherit;
  }

  *:focus,
  *:active,
  &:hover {
    outline: 0;
  }

  html {
    box-sizing: border-box;
    scroll-behavior: smooth;
    -webkit-text-size-adjust: 100%;
    -moz-text-size-adjust: 100%;
    -ms-text-size-adjust: 100%;
    text-size-adjust: 100%;
    font-kerning: normal;
    text-rendering: optimizeSpeed;
    font-variant-ligatures: contextual common-ligatures;
    font-feature-settings: 'kern' 1, 'liga' 1, 'calt' 1;
    -webkit-overflow-scrolling: touch;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    cursor: default;
    overflow-wrap: break-word;
    font-weight: normal;
  }

  body {
    min-height: 100vh;
  }

  a {
    text-decoration-skip-ink: auto;
  }

  img {
    display: block;
    max-width: 100%;
  }

  input,
  button,
  textarea,
  select {
    display: block;
    font: inherit;
    width: auto;
    max-width: unset;
    background: transparent;
  }

  img:not([alt]) {
    filter: blur(10px);
  }

  hr {
    display: block;
    border: 0 solid;
    margin-block-start: 0;
    margin-block-end: 0;
    margin-inline-start: 0;
    margin-inline-end: 0;
    color: inherit;
    -moz-float-edge: unset;
    box-sizing: inherit;
  }

  /* user-agent */

  *:-moz-focusring {
    color: transparent !important;
    text-shadow: 0 0 0 #000 !important;
  }

  *::-moz-focus-inner {
    outline: none !important;
  }

`;

    let css$3 = css => css;
    var Variables = css$3`

  :root {
    font-size: var(--fs);

    /* config */
    --ratio-large: (4/3);
    --ratio-small: (5/4);
    --measure: 65ch;
    --fs-large: 19px;
    --fs-small: 16px;
    --radius: 3px;
    --border-thin: 1px;
    --border-thick: 4px;
    --border-hairline-top: linear-gradient(to bottom, var(--sec) .5px, transparent .5px);
    --border-hairline-bottom: linear-gradient(to top, var(--sec) .5px, transparent .5px);

    /* units */
    --s-5: calc(var(--s-4) / var(--ratio));
    --s-4: calc(var(--s-3) / var(--ratio));
    --s-3: calc(var(--s-2) / var(--ratio));
    --s-2: calc(var(--s-1) / var(--ratio));
    --s-1: calc(var(--s0)  / var(--ratio));
    --s0:  1rem;
    --s1:  calc(var(--s0)  * var(--ratio));
    --s2:  calc(var(--s1)  * var(--ratio));
    --s3:  calc(var(--s2)  * var(--ratio));
    --s4:  calc(var(--s3)  * var(--ratio));
    --s5:  calc(var(--s4)  * var(--ratio));

    /* fonts */
    --ff:  defff, Graphik, 'Graphik LCG', system-ui, sans-serif;
    --ffa: defff, Graphik, 'Graphik LCG', system-ui, sans-serif;
    --ffm: Menlo, Courier, Courier New, Andale Mono, monospace;

    --h0: 600 var(--s5)  / var(--lh) var(--ffa);
    --h1: 500 var(--s4)  / var(--lh) var(--ffa);
    --h2: 500 var(--s3)  / var(--lh) var(--ffa);
    --h3: 500 var(--s2)  / var(--lh) var(--ff);
    --h4: 500 var(--s1)  / var(--lh) var(--ff);
    --h5: 500 var(--s0)  / var(--lh) var(--ff);
    --h6: 600 var(--s-1) / var(--lh) var(--ff);
    --font:   var(--s0)  / var(--lh) var(--ff);
    --small:  var(--s-1) / var(--lh) var(--ff);
    --mono:   var(--s-1) / var(--lh) var(--ffm);

    /* animation */
    --ease: cubic-bezier(.12,.8,.32,1);

    /* color */
    --pri: #000;
    --sec: #666;
    --ter: #EAEAEA;
    --qua: #FAFAFA;
    --qui: #FFF;
    --acc: 82,139,247;
    --focus: rgba(var(--acc), 0.2);
  }

  * { --lh: calc(1em + .4rem); }
  
  @media (max-width: 768px) { :root {
    --fs: var(--fs-small);
    --ratio: var(--ratio-small);
  }}

  @media (min-width: 769px) { :root {
    --fs: var(--fs-large);
    --ratio: var(--ratio-large);
  }}

`;

    emotion.injectGlobal`
  ${Fonts}
  ${Reset}
  ${Core}
  ${Variables}
`;

    const app = new App({ target:document.body });

    return app;

}());
//# sourceMappingURL=bundle.js.map
