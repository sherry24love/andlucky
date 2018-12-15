webpackJsonp([2],{

/***/ 246:
/***/ (function(module, exports) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var stylesInDom = {},
	memoize = function(fn) {
		var memo;
		return function () {
			if (typeof memo === "undefined") memo = fn.apply(this, arguments);
			return memo;
		};
	},
	isOldIE = memoize(function() {
		return /msie [6-9]\b/.test(window.navigator.userAgent.toLowerCase());
	}),
	getHeadElement = memoize(function () {
		return document.head || document.getElementsByTagName("head")[0];
	}),
	singletonElement = null,
	singletonCounter = 0,
	styleElementsInsertedAtTop = [];

module.exports = function(list, options) {
	if(typeof DEBUG !== "undefined" && DEBUG) {
		if(typeof document !== "object") throw new Error("The style-loader cannot be used in a non-browser environment");
	}

	options = options || {};
	// Force single-tag solution on IE6-9, which has a hard limit on the # of <style>
	// tags it will allow on a page
	if (typeof options.singleton === "undefined") options.singleton = isOldIE();

	// By default, add <style> tags to the bottom of <head>.
	if (typeof options.insertAt === "undefined") options.insertAt = "bottom";

	var styles = listToStyles(list);
	addStylesToDom(styles, options);

	return function update(newList) {
		var mayRemove = [];
		for(var i = 0; i < styles.length; i++) {
			var item = styles[i];
			var domStyle = stylesInDom[item.id];
			domStyle.refs--;
			mayRemove.push(domStyle);
		}
		if(newList) {
			var newStyles = listToStyles(newList);
			addStylesToDom(newStyles, options);
		}
		for(var i = 0; i < mayRemove.length; i++) {
			var domStyle = mayRemove[i];
			if(domStyle.refs === 0) {
				for(var j = 0; j < domStyle.parts.length; j++)
					domStyle.parts[j]();
				delete stylesInDom[domStyle.id];
			}
		}
	};
}

function addStylesToDom(styles, options) {
	for(var i = 0; i < styles.length; i++) {
		var item = styles[i];
		var domStyle = stylesInDom[item.id];
		if(domStyle) {
			domStyle.refs++;
			for(var j = 0; j < domStyle.parts.length; j++) {
				domStyle.parts[j](item.parts[j]);
			}
			for(; j < item.parts.length; j++) {
				domStyle.parts.push(addStyle(item.parts[j], options));
			}
		} else {
			var parts = [];
			for(var j = 0; j < item.parts.length; j++) {
				parts.push(addStyle(item.parts[j], options));
			}
			stylesInDom[item.id] = {id: item.id, refs: 1, parts: parts};
		}
	}
}

function listToStyles(list) {
	var styles = [];
	var newStyles = {};
	for(var i = 0; i < list.length; i++) {
		var item = list[i];
		var id = item[0];
		var css = item[1];
		var media = item[2];
		var sourceMap = item[3];
		var part = {css: css, media: media, sourceMap: sourceMap};
		if(!newStyles[id])
			styles.push(newStyles[id] = {id: id, parts: [part]});
		else
			newStyles[id].parts.push(part);
	}
	return styles;
}

function insertStyleElement(options, styleElement) {
	var head = getHeadElement();
	var lastStyleElementInsertedAtTop = styleElementsInsertedAtTop[styleElementsInsertedAtTop.length - 1];
	if (options.insertAt === "top") {
		if(!lastStyleElementInsertedAtTop) {
			head.insertBefore(styleElement, head.firstChild);
		} else if(lastStyleElementInsertedAtTop.nextSibling) {
			head.insertBefore(styleElement, lastStyleElementInsertedAtTop.nextSibling);
		} else {
			head.appendChild(styleElement);
		}
		styleElementsInsertedAtTop.push(styleElement);
	} else if (options.insertAt === "bottom") {
		head.appendChild(styleElement);
	} else {
		throw new Error("Invalid value for parameter 'insertAt'. Must be 'top' or 'bottom'.");
	}
}

function removeStyleElement(styleElement) {
	styleElement.parentNode.removeChild(styleElement);
	var idx = styleElementsInsertedAtTop.indexOf(styleElement);
	if(idx >= 0) {
		styleElementsInsertedAtTop.splice(idx, 1);
	}
}

function createStyleElement(options) {
	var styleElement = document.createElement("style");
	styleElement.type = "text/css";
	insertStyleElement(options, styleElement);
	return styleElement;
}

function addStyle(obj, options) {
	var styleElement, update, remove;

	if (options.singleton) {
		var styleIndex = singletonCounter++;
		styleElement = singletonElement || (singletonElement = createStyleElement(options));
		update = applyToSingletonTag.bind(null, styleElement, styleIndex, false);
		remove = applyToSingletonTag.bind(null, styleElement, styleIndex, true);
	} else {
		styleElement = createStyleElement(options);
		update = applyToTag.bind(null, styleElement);
		remove = function() {
			removeStyleElement(styleElement);
		};
	}

	update(obj);

	return function updateStyle(newObj) {
		if(newObj) {
			if(newObj.css === obj.css && newObj.media === obj.media && newObj.sourceMap === obj.sourceMap)
				return;
			update(obj = newObj);
		} else {
			remove();
		}
	};
}

var replaceText = (function () {
	var textStore = [];

	return function (index, replacement) {
		textStore[index] = replacement;
		return textStore.filter(Boolean).join('\n');
	};
})();

function applyToSingletonTag(styleElement, index, remove, obj) {
	var css = remove ? "" : obj.css;

	if (styleElement.styleSheet) {
		styleElement.styleSheet.cssText = replaceText(index, css);
	} else {
		var cssNode = document.createTextNode(css);
		var childNodes = styleElement.childNodes;
		if (childNodes[index]) styleElement.removeChild(childNodes[index]);
		if (childNodes.length) {
			styleElement.insertBefore(cssNode, childNodes[index]);
		} else {
			styleElement.appendChild(cssNode);
		}
	}
}

function applyToTag(styleElement, obj) {
	var css = obj.css;
	var media = obj.media;
	var sourceMap = obj.sourceMap;

	if (media) {
		styleElement.setAttribute("media", media);
	}

	if (sourceMap) {
		// https://developer.chrome.com/devtools/docs/javascript-debugging
		// this makes source maps inside style tags work properly in Chrome
		css += '\n/*# sourceURL=' + sourceMap.sources[0] + ' */';
		// http://stackoverflow.com/a/26603875
		css += "\n/*# sourceMappingURL=data:application/json;base64," + btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))) + " */";
	}

	if (styleElement.styleSheet) {
		styleElement.styleSheet.cssText = css;
	} else {
		while(styleElement.firstChild) {
			styleElement.removeChild(styleElement.firstChild);
		}
		styleElement.appendChild(document.createTextNode(css));
	}
}


/***/ }),

/***/ 247:
/***/ (function(module, exports, __webpack_require__) {

!function(e,t){ true?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.VueInfiniteLoading=t():e.VueInfiniteLoading=t()}("undefined"!=typeof self?self:this,function(){return function(e){function t(n){if(i[n])return i[n].exports;var a=i[n]={i:n,l:!1,exports:{}};return e[n].call(a.exports,a,a.exports,t),a.l=!0,a.exports}var i={};return t.m=e,t.c=i,t.d=function(e,i,n){t.o(e,i)||Object.defineProperty(e,i,{configurable:!1,enumerable:!0,get:n})},t.n=function(e){var i=e&&e.__esModule?function(){return e.default}:function(){return e};return t.d(i,"a",i),i},t.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},t.p="/",t(t.s=3)}([function(e,t){function i(e,t){var i=e[1]||"",a=e[3];if(!a)return i;if(t&&"function"==typeof btoa){var r=n(a);return[i].concat(a.sources.map(function(e){return"/*# sourceURL="+a.sourceRoot+e+" */"})).concat([r]).join("\n")}return[i].join("\n")}function n(e){return"/*# sourceMappingURL=data:application/json;charset=utf-8;base64,"+btoa(unescape(encodeURIComponent(JSON.stringify(e))))+" */"}e.exports=function(e){var t=[];return t.toString=function(){return this.map(function(t){var n=i(t,e);return t[2]?"@media "+t[2]+"{"+n+"}":n}).join("")},t.i=function(e,i){"string"==typeof e&&(e=[[null,e,""]]);for(var n={},a=0;a<this.length;a++){var r=this[a][0];"number"==typeof r&&(n[r]=!0)}for(a=0;a<e.length;a++){var o=e[a];"number"==typeof o[0]&&n[o[0]]||(i&&!o[2]?o[2]=i:i&&(o[2]="("+o[2]+") and ("+i+")"),t.push(o))}},t}},function(e,t,i){function n(e){for(var t=0;t<e.length;t++){var i=e[t],n=f[i.id];if(n){n.refs++;for(var a=0;a<n.parts.length;a++)n.parts[a](i.parts[a]);for(;a<i.parts.length;a++)n.parts.push(r(i.parts[a]));n.parts.length>i.parts.length&&(n.parts.length=i.parts.length)}else{for(var o=[],a=0;a<i.parts.length;a++)o.push(r(i.parts[a]));f[i.id]={id:i.id,refs:1,parts:o}}}}function a(){var e=document.createElement("style");return e.type="text/css",c.appendChild(e),e}function r(e){var t,i,n=document.querySelector('style[data-vue-ssr-id~="'+e.id+'"]');if(n){if(m)return h;n.parentNode.removeChild(n)}if(b){var r=p++;n=u||(u=a()),t=o.bind(null,n,r,!1),i=o.bind(null,n,r,!0)}else n=a(),t=s.bind(null,n),i=function(){n.parentNode.removeChild(n)};return t(e),function(n){if(n){if(n.css===e.css&&n.media===e.media&&n.sourceMap===e.sourceMap)return;t(e=n)}else i()}}function o(e,t,i,n){var a=i?"":n.css;if(e.styleSheet)e.styleSheet.cssText=g(t,a);else{var r=document.createTextNode(a),o=e.childNodes;o[t]&&e.removeChild(o[t]),o.length?e.insertBefore(r,o[t]):e.appendChild(r)}}function s(e,t){var i=t.css,n=t.media,a=t.sourceMap;if(n&&e.setAttribute("media",n),a&&(i+="\n/*# sourceURL="+a.sources[0]+" */",i+="\n/*# sourceMappingURL=data:application/json;base64,"+btoa(unescape(encodeURIComponent(JSON.stringify(a))))+" */"),e.styleSheet)e.styleSheet.cssText=i;else{for(;e.firstChild;)e.removeChild(e.firstChild);e.appendChild(document.createTextNode(i))}}var l="undefined"!=typeof document;if("undefined"!=typeof DEBUG&&DEBUG&&!l)throw new Error("vue-style-loader cannot be used in a non-browser environment. Use { target: 'node' } in your Webpack config to indicate a server-rendering environment.");var d=i(7),f={},c=l&&(document.head||document.getElementsByTagName("head")[0]),u=null,p=0,m=!1,h=function(){},b="undefined"!=typeof navigator&&/msie [6-9]\b/.test(navigator.userAgent.toLowerCase());e.exports=function(e,t,i){m=i;var a=d(e,t);return n(a),function(t){for(var i=[],r=0;r<a.length;r++){var o=a[r],s=f[o.id];s.refs--,i.push(s)}t?(a=d(e,t),n(a)):a=[];for(var r=0;r<i.length;r++){var s=i[r];if(0===s.refs){for(var l=0;l<s.parts.length;l++)s.parts[l]();delete f[s.id]}}}};var g=function(){var e=[];return function(t,i){return e[t]=i,e.filter(Boolean).join("\n")}}()},function(e,t){e.exports=function(e,t,i,n,a,r){var o,s=e=e||{},l=typeof e.default;"object"!==l&&"function"!==l||(o=e,s=e.default);var d="function"==typeof s?s.options:s;t&&(d.render=t.render,d.staticRenderFns=t.staticRenderFns,d._compiled=!0),i&&(d.functional=!0),a&&(d._scopeId=a);var f;if(r?(f=function(e){e=e||this.$vnode&&this.$vnode.ssrContext||this.parent&&this.parent.$vnode&&this.parent.$vnode.ssrContext,e||"undefined"==typeof __VUE_SSR_CONTEXT__||(e=__VUE_SSR_CONTEXT__),n&&n.call(this,e),e&&e._registeredComponents&&e._registeredComponents.add(r)},d._ssrRegister=f):n&&(f=n),f){var c=d.functional,u=c?d.render:d.beforeCreate;c?(d._injectStyles=f,d.render=function(e,t){return f.call(t),u(e,t)}):d.beforeCreate=u?[].concat(u,f):[f]}return{esModule:o,exports:s,options:d}}},function(e,t,i){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var n=i(4);t.default=n.a,"undefined"!=typeof window&&window.Vue&&window.Vue.component("infinite-loading",n.a)},function(e,t,i){"use strict";function n(e){i(5)}var a=i(8),r=i(14),o=i(2),s=n,l=o(a.a,r.a,!1,s,"data-v-fb2c869e",null);t.a=l.exports},function(e,t,i){var n=i(6);"string"==typeof n&&(n=[[e.i,n,""]]),n.locals&&(e.exports=n.locals);i(1)("2249d7a7",n,!0)},function(e,t,i){t=e.exports=i(0)(void 0),t.push([e.i,".infinite-loading-container[data-v-fb2c869e]{clear:both;text-align:center}.infinite-loading-container[data-v-fb2c869e] [class^=loading-]{display:inline-block;margin:15px 0;width:28px;height:28px;font-size:28px;line-height:28px;border-radius:50%}.infinite-status-prompt[data-v-fb2c869e]{color:#666;font-size:14px;text-align:center;padding:10px 0}",""])},function(e,t){e.exports=function(e,t){for(var i=[],n={},a=0;a<t.length;a++){var r=t[a],o=r[0],s=r[1],l=r[2],d=r[3],f={id:e+":"+a,css:s,media:l,sourceMap:d};n[o]?n[o].parts.push(f):i.push(n[o]={id:o,parts:[f]})}return i}},function(e,t,i){"use strict";var n=i(9),a={STATE_CHANGER:["[Vue-infinite-loading warn]: emit `loaded` and `complete` event through component instance of `$refs` may cause error, so it will be deprecated soon, please use the `$state` argument instead (`$state` just the special `$event` variable):","\ntemplate:",'<infinite-loading @infinite="infiniteHandler"></infinite-loading>',"\nscript:\n...\ninfiniteHandler($state) {\n  ajax('https://www.example.com/api/news')\n    .then((res) => {\n      if (res.data.length) {\n        $state.loaded();\n      } else {\n        $state.complete();\n      }\n    });\n}\n...","","more details: https://github.com/PeachScript/vue-infinite-loading/issues/57#issuecomment-324370549"].join("\n"),INFINITE_EVENT:"[Vue-infinite-loading warn]: `:on-infinite` property will be deprecated soon, please use `@infinite` event instead."},r={INFINITE_LOOP:["[Vue-infinite-loading error]: executed the callback function more than 10 times for a short time, it looks like searched a wrong scroll wrapper that doest not has fixed height or maximum height, please check it. If you want to force to set a element as scroll wrapper ranther than automatic searching, you can do this:",'\n\x3c!-- add a special attribute for the real scroll wrapper --\x3e\n<div infinite-wrapper>\n  ...\n  \x3c!-- set force-use-infinite-wrapper to true --\x3e\n  <infinite-loading force-use-infinite-wrapper="true"></infinite-loading>\n</div>\n    ',"more details: https://github.com/PeachScript/vue-infinite-loading/issues/55#issuecomment-316934169"].join("\n")};t.a={name:"InfiniteLoading",data:function(){return{scrollParent:null,scrollHandler:null,isLoading:!1,isComplete:!1,isFirstLoad:!0,debounceTimer:null,debounceDuration:50,infiniteLoopChecked:!1,infiniteLoopTimer:null,continuousCallTimes:0}},components:{Spinner:n.a},computed:{isNoResults:{cache:!1,get:function(){var e=this.$slots["no-results"],t=e&&e[0].elm&&""===e[0].elm.textContent;return!this.isLoading&&this.isComplete&&this.isFirstLoad&&!t}},isNoMore:{cache:!1,get:function(){var e=this.$slots["no-more"],t=e&&e[0].elm&&""===e[0].elm.textContent;return!this.isLoading&&this.isComplete&&!this.isFirstLoad&&!t}}},props:{distance:{type:Number,default:100},onInfinite:Function,spinner:String,direction:{type:String,default:"bottom"},forceUseInfiniteWrapper:null},mounted:function(){var e=this;this.scrollParent=this.getScrollParent(),this.scrollHandler=function(e){this.isLoading||(clearTimeout(this.debounceTimer),e&&e.constructor===Event?this.debounceTimer=setTimeout(this.attemptLoad,this.debounceDuration):this.attemptLoad())}.bind(this),setTimeout(this.scrollHandler,1),this.scrollParent.addEventListener("scroll",this.scrollHandler),this.$on("$InfiniteLoading:loaded",function(t){e.isFirstLoad=!1,e.isLoading&&e.$nextTick(e.attemptLoad.bind(null,!0)),t&&t.target===e||console.warn(a.STATE_CHANGER)}),this.$on("$InfiniteLoading:complete",function(t){e.isLoading=!1,e.isComplete=!0,e.$nextTick(function(){e.$forceUpdate()}),e.scrollParent.removeEventListener("scroll",e.scrollHandler),t&&t.target===e||console.warn(a.STATE_CHANGER)}),this.$on("$InfiniteLoading:reset",function(){e.isLoading=!1,e.isComplete=!1,e.isFirstLoad=!0,e.scrollParent.addEventListener("scroll",e.scrollHandler),setTimeout(e.scrollHandler,1)}),this.onInfinite&&console.warn(a.INFINITE_EVENT),this.stateChanger={loaded:function(){e.$emit("$InfiniteLoading:loaded",{target:e})},complete:function(){e.$emit("$InfiniteLoading:complete",{target:e})},reset:function(){e.$emit("$InfiniteLoading:reset",{target:e})}},this.$watch("forceUseInfiniteWrapper",function(){e.scrollParent=e.getScrollParent()})},deactivated:function(){this.isLoading=!1,this.scrollParent.removeEventListener("scroll",this.scrollHandler)},activated:function(){this.scrollParent.addEventListener("scroll",this.scrollHandler)},methods:{attemptLoad:function(e){var t=this,i=this.getCurrentDistance();!this.isComplete&&i<=this.distance&&this.$el.offsetWidth+this.$el.offsetHeight>0?(this.isLoading=!0,"function"==typeof this.onInfinite?this.onInfinite.call(null,this.stateChanger):this.$emit("infinite",this.stateChanger),!e||this.forceUseInfiniteWrapper||this.infiniteLoopChecked||(this.continuousCallTimes+=1,clearTimeout(this.infiniteLoopTimer),this.infiniteLoopTimer=setTimeout(function(){t.infiniteLoopChecked=!0},1e3),this.continuousCallTimes>10&&(console.error(r.INFINITE_LOOP),this.infiniteLoopChecked=!0))):this.isLoading=!1},getCurrentDistance:function(){var e=void 0;if("top"===this.direction)e=isNaN(this.scrollParent.scrollTop)?this.scrollParent.pageYOffset:this.scrollParent.scrollTop;else{e=this.$el.getBoundingClientRect().top-(this.scrollParent===window?window.innerHeight:this.scrollParent.getBoundingClientRect().bottom)}return e},getScrollParent:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:this.$el,t=void 0;return"BODY"===e.tagName?t=window:!this.forceUseInfiniteWrapper&&["scroll","auto"].indexOf(getComputedStyle(e).overflowY)>-1?t=e:(e.hasAttribute("infinite-wrapper")||e.hasAttribute("data-infinite-wrapper"))&&(t=e),t||this.getScrollParent(e.parentNode)}},destroyed:function(){this.isComplete||this.scrollParent.removeEventListener("scroll",this.scrollHandler)}}},function(e,t,i){"use strict";function n(e){i(10)}var a=i(12),r=i(13),o=i(2),s=n,l=o(a.a,r.a,!1,s,"data-v-6e1fd88f",null);t.a=l.exports},function(e,t,i){var n=i(11);"string"==typeof n&&(n=[[e.i,n,""]]),n.locals&&(e.exports=n.locals);i(1)("29881045",n,!0)},function(e,t,i){t=e.exports=i(0)(void 0),t.push([e.i,'.loading-wave-dots[data-v-6e1fd88f]{position:relative}.loading-wave-dots[data-v-6e1fd88f] .wave-item{position:absolute;top:50%;left:50%;display:inline-block;margin-top:-4px;width:8px;height:8px;border-radius:50%;-webkit-animation:loading-wave-dots-data-v-6e1fd88f linear 2.8s infinite;animation:loading-wave-dots-data-v-6e1fd88f linear 2.8s infinite}.loading-wave-dots[data-v-6e1fd88f] .wave-item:first-child{margin-left:-36px}.loading-wave-dots[data-v-6e1fd88f] .wave-item:nth-child(2){margin-left:-20px;-webkit-animation-delay:.14s;animation-delay:.14s}.loading-wave-dots[data-v-6e1fd88f] .wave-item:nth-child(3){margin-left:-4px;-webkit-animation-delay:.28s;animation-delay:.28s}.loading-wave-dots[data-v-6e1fd88f] .wave-item:nth-child(4){margin-left:12px;-webkit-animation-delay:.42s;animation-delay:.42s}.loading-wave-dots[data-v-6e1fd88f] .wave-item:last-child{margin-left:28px;-webkit-animation-delay:.56s;animation-delay:.56s}@-webkit-keyframes loading-wave-dots-data-v-6e1fd88f{0%{-webkit-transform:translateY(0);transform:translateY(0);background:#bbb}10%{-webkit-transform:translateY(-6px);transform:translateY(-6px);background:#999}20%{-webkit-transform:translateY(0);transform:translateY(0);background:#bbb}to{-webkit-transform:translateY(0);transform:translateY(0);background:#bbb}}@keyframes loading-wave-dots-data-v-6e1fd88f{0%{-webkit-transform:translateY(0);transform:translateY(0);background:#bbb}10%{-webkit-transform:translateY(-6px);transform:translateY(-6px);background:#999}20%{-webkit-transform:translateY(0);transform:translateY(0);background:#bbb}to{-webkit-transform:translateY(0);transform:translateY(0);background:#bbb}}.loading-circles[data-v-6e1fd88f] .circle-item{width:5px;height:5px;-webkit-animation:loading-circles-data-v-6e1fd88f linear .75s infinite;animation:loading-circles-data-v-6e1fd88f linear .75s infinite}.loading-circles[data-v-6e1fd88f] .circle-item:first-child{margin-top:-14.5px;margin-left:-2.5px}.loading-circles[data-v-6e1fd88f] .circle-item:nth-child(2){margin-top:-11.26px;margin-left:6.26px}.loading-circles[data-v-6e1fd88f] .circle-item:nth-child(3){margin-top:-2.5px;margin-left:9.5px}.loading-circles[data-v-6e1fd88f] .circle-item:nth-child(4){margin-top:6.26px;margin-left:6.26px}.loading-circles[data-v-6e1fd88f] .circle-item:nth-child(5){margin-top:9.5px;margin-left:-2.5px}.loading-circles[data-v-6e1fd88f] .circle-item:nth-child(6){margin-top:6.26px;margin-left:-11.26px}.loading-circles[data-v-6e1fd88f] .circle-item:nth-child(7){margin-top:-2.5px;margin-left:-14.5px}.loading-circles[data-v-6e1fd88f] .circle-item:last-child{margin-top:-11.26px;margin-left:-11.26px}@-webkit-keyframes loading-circles-data-v-6e1fd88f{0%{background:#dfdfdf}90%{background:#505050}to{background:#dfdfdf}}@keyframes loading-circles-data-v-6e1fd88f{0%{background:#dfdfdf}90%{background:#505050}to{background:#dfdfdf}}.loading-bubbles[data-v-6e1fd88f] .bubble-item{background:#666;-webkit-animation:loading-bubbles-data-v-6e1fd88f linear .75s infinite;animation:loading-bubbles-data-v-6e1fd88f linear .75s infinite}.loading-bubbles[data-v-6e1fd88f] .bubble-item:first-child{margin-top:-12.5px;margin-left:-.5px}.loading-bubbles[data-v-6e1fd88f] .bubble-item:nth-child(2){margin-top:-9.26px;margin-left:8.26px}.loading-bubbles[data-v-6e1fd88f] .bubble-item:nth-child(3){margin-top:-.5px;margin-left:11.5px}.loading-bubbles[data-v-6e1fd88f] .bubble-item:nth-child(4){margin-top:8.26px;margin-left:8.26px}.loading-bubbles[data-v-6e1fd88f] .bubble-item:nth-child(5){margin-top:11.5px;margin-left:-.5px}.loading-bubbles[data-v-6e1fd88f] .bubble-item:nth-child(6){margin-top:8.26px;margin-left:-9.26px}.loading-bubbles[data-v-6e1fd88f] .bubble-item:nth-child(7){margin-top:-.5px;margin-left:-12.5px}.loading-bubbles[data-v-6e1fd88f] .bubble-item:last-child{margin-top:-9.26px;margin-left:-9.26px}@-webkit-keyframes loading-bubbles-data-v-6e1fd88f{0%{width:1px;height:1px;box-shadow:0 0 0 3px #666}90%{width:1px;height:1px;box-shadow:0 0 0 0 #666}to{width:1px;height:1px;box-shadow:0 0 0 3px #666}}@keyframes loading-bubbles-data-v-6e1fd88f{0%{width:1px;height:1px;box-shadow:0 0 0 3px #666}90%{width:1px;height:1px;box-shadow:0 0 0 0 #666}to{width:1px;height:1px;box-shadow:0 0 0 3px #666}}.loading-default[data-v-6e1fd88f]{position:relative;border:1px solid #999;-webkit-animation:loading-rotating-data-v-6e1fd88f ease 1.5s infinite;animation:loading-rotating-data-v-6e1fd88f ease 1.5s infinite}.loading-default[data-v-6e1fd88f]:before{content:"";position:absolute;display:block;top:0;left:50%;margin-top:-3px;margin-left:-3px;width:6px;height:6px;background-color:#999;border-radius:50%}.loading-spiral[data-v-6e1fd88f]{border:2px solid #777;border-right-color:transparent;-webkit-animation:loading-rotating-data-v-6e1fd88f linear .85s infinite;animation:loading-rotating-data-v-6e1fd88f linear .85s infinite}@-webkit-keyframes loading-rotating-data-v-6e1fd88f{0%{-webkit-transform:rotate(0);transform:rotate(0)}to{-webkit-transform:rotate(1turn);transform:rotate(1turn)}}@keyframes loading-rotating-data-v-6e1fd88f{0%{-webkit-transform:rotate(0);transform:rotate(0)}to{-webkit-transform:rotate(1turn);transform:rotate(1turn)}}.loading-bubbles[data-v-6e1fd88f],.loading-circles[data-v-6e1fd88f]{position:relative}.loading-bubbles[data-v-6e1fd88f] .bubble-item,.loading-circles[data-v-6e1fd88f] .circle-item{position:absolute;top:50%;left:50%;display:inline-block;border-radius:50%}.loading-bubbles[data-v-6e1fd88f] .bubble-item:nth-child(2),.loading-circles[data-v-6e1fd88f] .circle-item:nth-child(2){-webkit-animation-delay:93ms;animation-delay:93ms}.loading-bubbles[data-v-6e1fd88f] .bubble-item:nth-child(3),.loading-circles[data-v-6e1fd88f] .circle-item:nth-child(3){-webkit-animation-delay:.186s;animation-delay:.186s}.loading-bubbles[data-v-6e1fd88f] .bubble-item:nth-child(4),.loading-circles[data-v-6e1fd88f] .circle-item:nth-child(4){-webkit-animation-delay:.279s;animation-delay:.279s}.loading-bubbles[data-v-6e1fd88f] .bubble-item:nth-child(5),.loading-circles[data-v-6e1fd88f] .circle-item:nth-child(5){-webkit-animation-delay:.372s;animation-delay:.372s}.loading-bubbles[data-v-6e1fd88f] .bubble-item:nth-child(6),.loading-circles[data-v-6e1fd88f] .circle-item:nth-child(6){-webkit-animation-delay:.465s;animation-delay:.465s}.loading-bubbles[data-v-6e1fd88f] .bubble-item:nth-child(7),.loading-circles[data-v-6e1fd88f] .circle-item:nth-child(7){-webkit-animation-delay:.558s;animation-delay:.558s}.loading-bubbles[data-v-6e1fd88f] .bubble-item:last-child,.loading-circles[data-v-6e1fd88f] .circle-item:last-child{-webkit-animation-delay:.651s;animation-delay:.651s}',""])},function(e,t,i){"use strict";var n={BUBBLES:{render:function(e){return e("span",{attrs:{class:"loading-bubbles"}},Array.apply(Array,Array(8)).map(function(){return e("span",{attrs:{class:"bubble-item"}})}))}},CIRCLES:{render:function(e){return e("span",{attrs:{class:"loading-circles"}},Array.apply(Array,Array(8)).map(function(){return e("span",{attrs:{class:"circle-item"}})}))}},DEFAULT:{render:function(e){return e("i",{attrs:{class:"loading-default"}})}},SPIRAL:{render:function(e){return e("i",{attrs:{class:"loading-spiral"}})}},WAVEDOTS:{render:function(e){return e("span",{attrs:{class:"loading-wave-dots"}},Array.apply(Array,Array(5)).map(function(){return e("span",{attrs:{class:"wave-item"}})}))}}};t.a={name:"spinner",computed:{spinnerView:function(){return n[(this.spinner||"").toUpperCase()]||n.DEFAULT}},props:{spinner:String}}},function(e,t,i){"use strict";var n=function(){var e=this,t=e.$createElement;return(e._self._c||t)(e.spinnerView,{tag:"component"})},a=[],r={render:n,staticRenderFns:a};t.a=r},function(e,t,i){"use strict";var n=function(){var e=this,t=e.$createElement,i=e._self._c||t;return i("div",{staticClass:"infinite-loading-container"},[i("div",{directives:[{name:"show",rawName:"v-show",value:e.isLoading,expression:"isLoading"}]},[e._t("spinner",[i("spinner",{attrs:{spinner:e.spinner}})])],2),e._v(" "),i("div",{directives:[{name:"show",rawName:"v-show",value:e.isNoResults,expression:"isNoResults"}],staticClass:"infinite-status-prompt"},[e._t("no-results",[e._v("No results :(")])],2),e._v(" "),i("div",{directives:[{name:"show",rawName:"v-show",value:e.isNoMore,expression:"isNoMore"}],staticClass:"infinite-status-prompt"},[e._t("no-more",[e._v("No more data :)")])],2)])},a=[],r={render:n,staticRenderFns:a};t.a=r}])});

/***/ }),

/***/ 248:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//

/* harmony default export */ __webpack_exports__["default"] = ({
    props: ['select'],
    data: function data() {
        return {
            channelShow: false,
            showOverlay: false,
            pupShow: false
        };
    },
    created: function created() {},
    methods: {
        showPub: function showPub() {
            this.pupShow = true;
            this.showOverlay = true;
        },
        hidePub: function hidePub() {
            this.pupShow = false;
            this.showOverlay = false;
        }
    }
});

/***/ }),

/***/ 249:
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(11)(false);
// imports


// module
exports.push([module.i, "\n.bar-footer[data-v-64bbb855] {\n        position: absolute;\n        right: 0;\n        left: 0;\n        z-index: 4000;\n        height: 2.2rem;\n        padding-right: 0.5rem;\n        padding-left: 0.5rem;\n        background-color: #734d41;\n        -webkit-backface-visibility: hidden;\n        backface-visibility: hidden;\n}\n", ""]);

// exports


/***/ }),

/***/ 250:
/***/ (function(module, exports, __webpack_require__) {

var __vue_exports__, __vue_options__
var __vue_styles__ = {}

/* styles */
__webpack_require__(252)

/* script */
__vue_exports__ = __webpack_require__(248)

/* template */
var __vue_template__ = __webpack_require__(251)
__vue_options__ = __vue_exports__ = __vue_exports__ || {}
if (
  typeof __vue_exports__.default === "object" ||
  typeof __vue_exports__.default === "function"
) {
if (Object.keys(__vue_exports__).some(function (key) { return key !== "default" && key !== "__esModule" })) {console.error("named exports are not supported in *.vue files.")}
__vue_options__ = __vue_exports__ = __vue_exports__.default
}
if (typeof __vue_options__ === "function") {
  __vue_options__ = __vue_options__.options
}
__vue_options__.__file = "/Users/wangfan/Work/webroot/adm/resources/assets/js/components/footNav.vue"
__vue_options__.render = __vue_template__.render
__vue_options__.staticRenderFns = __vue_template__.staticRenderFns
__vue_options__._scopeId = "data-v-64bbb855"

/* hot reload */
if (false) {(function () {
  var hotAPI = require("vue-hot-reload-api")
  hotAPI.install(require("vue"), false)
  if (!hotAPI.compatible) return
  module.hot.accept()
  if (!module.hot.data) {
    hotAPI.createRecord("data-v-64bbb855", __vue_options__)
  } else {
    hotAPI.reload("data-v-64bbb855", __vue_options__)
  }
})()}
if (__vue_options__.functional) {console.error("[vue-loader] footNav.vue: functional components are not supported and should be defined in plain js files using render functions.")}

module.exports = __vue_exports__


/***/ }),

/***/ 251:
/***/ (function(module, exports, __webpack_require__) {

module.exports={render:function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;
  return _c('div', {
    staticClass: "bar-footer"
  }, [_c('nav', {
    staticClass: "bar bar-tab"
  }, [_c('router-link', {
    staticClass: "tab-item",
    class: {
      active: 'channel' == _vm.select
    },
    attrs: {
      "to": {
        name: 'microblog'
      }
    }
  }, [_c('span', {
    staticClass: "icon icon icon-menu"
  }), _vm._v(" "), _c('span', {
    staticClass: "tab-label"
  }, [_vm._v("资讯")])]), _vm._v(" "), _c('router-link', {
    staticClass: "tab-item",
    class: {
      active: 'home' == _vm.select
    },
    attrs: {
      "to": {
        name: 'home'
      }
    }
  }, [_c('span', {
    staticClass: "icon iconfont icon-4"
  }), _vm._v(" "), _c('span', {
    staticClass: "tab-label"
  }, [_vm._v("小游戏")])]), _vm._v(" "), _c('a', {
    staticClass: "tab-item",
    class: {
      active: 'pub' == _vm.select
    },
    on: {
      "click": _vm.showPub
    }
  }, [_c('span', {
    staticClass: "icon iconfont icon-xinzeng-"
  }), _vm._v(" "), _c('span', {
    staticClass: "tab-label"
  }, [_vm._v("发布")])]), _vm._v(" "), _c('router-link', {
    staticClass: "tab-item",
    class: {
      active: 'chat' == _vm.select
    },
    attrs: {
      "to": {
        name: 'im-friends'
      }
    }
  }, [_c('span', {
    staticClass: "icon iconfont icon-conversation_icon"
  }), _vm._v(" "), _c('span', {
    staticClass: "tab-label"
  }, [_vm._v("好友")])]), _vm._v(" "), _c('router-link', {
    staticClass: "tab-item",
    class: {
      active: 'me' == _vm.select
    },
    attrs: {
      "to": {
        name: 'member'
      }
    }
  }, [_c('span', {
    staticClass: "icon iconfont icon-home1"
  }), _vm._v(" "), _c('span', {
    staticClass: "tab-label"
  }, [_vm._v("我")])])], 1), _vm._v(" "), (_vm.pupShow) ? _c('div', {
    staticClass: "modal-overlay",
    class: {
      'modal-overlay-visible': _vm.showOverlay
    }
  }) : _vm._e(), _vm._v(" "), (_vm.pupShow) ? _c('div', {
    staticClass: "actions-modal",
    class: {
      'modal-in': _vm.pupShow, 'modal-out': !_vm.pupShow,
    }
  }, [_c('div', {
    staticClass: "actions-modal-group"
  }, [_c('span', {
    staticClass: "actions-modal-label"
  }, [_vm._v("请选择")]), _vm._v(" "), _c('span', {
    staticClass: "actions-modal-button",
    on: {
      "click": function($event) {
        _vm.hidePub();
        _vm.$router.push({
          name: 'microblog-form'
        })
      }
    }
  }, [_vm._v("资讯")]), _vm._v(" "), _c('span', {
    staticClass: "actions-modal-button actions-modal-button-bold",
    on: {
      "click": function($event) {
        _vm.hidePub();
        _vm.$router.push({
          name: 'adv-form'
        })
      }
    }
  }, [_vm._v("广告")])]), _vm._v(" "), _c('div', {
    staticClass: "actions-modal-group"
  }, [_c('span', {
    staticClass: "actions-modal-button bg-danger",
    on: {
      "click": _vm.hidePub
    }
  }, [_vm._v("取消")])])]) : _vm._e()])
},staticRenderFns: []}
if (false) {
  module.hot.accept()
  if (module.hot.data) {
     require("vue-hot-reload-api").rerender("data-v-64bbb855", module.exports)
  }
}

/***/ }),

/***/ 252:
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(249);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(246)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../node_modules/css-loader/index.js!../../../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-64bbb855&scoped=true!../../../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./footNav.vue", function() {
			var newContent = require("!!../../../../node_modules/css-loader/index.js!../../../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-64bbb855&scoped=true!../../../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./footNav.vue");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),

/***/ 253:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//

/* harmony default export */ __webpack_exports__["default"] = ({
	name: 'menuNav',
	props: ['index'],
	data: function data() {
		return {};
	}
});

/***/ }),

/***/ 254:
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(11)(false);
// imports


// module
exports.push([module.i, "\n.bar.buttons-tab[data-v-808a2378] {\n\tbackground-color: #fff;\n\theight: 1.5rem;\n\tline-height: 1.5rem;\n\tpadding:0rem;\n}\n.bar.buttons-tab .button[data-v-808a2378] {\n\tfont-size:.65rem;\n\theight:1.5rem;\n\tline-height: 1.5rem;\n\ttop:0rem;\n\tcolor:#000;\n}\n.bar.buttons-tab .button.active[data-v-808a2378] {\n\tcolor:#724c41;\n\tborder-color:#724c41;\n}\n", ""]);

// exports


/***/ }),

/***/ 255:
/***/ (function(module, exports, __webpack_require__) {

var __vue_exports__, __vue_options__
var __vue_styles__ = {}

/* styles */
__webpack_require__(257)

/* script */
__vue_exports__ = __webpack_require__(253)

/* template */
var __vue_template__ = __webpack_require__(256)
__vue_options__ = __vue_exports__ = __vue_exports__ || {}
if (
  typeof __vue_exports__.default === "object" ||
  typeof __vue_exports__.default === "function"
) {
if (Object.keys(__vue_exports__).some(function (key) { return key !== "default" && key !== "__esModule" })) {console.error("named exports are not supported in *.vue files.")}
__vue_options__ = __vue_exports__ = __vue_exports__.default
}
if (typeof __vue_options__ === "function") {
  __vue_options__ = __vue_options__.options
}
__vue_options__.__file = "/Users/wangfan/Work/webroot/adm/resources/assets/js/components/menuNav.vue"
__vue_options__.render = __vue_template__.render
__vue_options__.staticRenderFns = __vue_template__.staticRenderFns
__vue_options__._scopeId = "data-v-808a2378"

/* hot reload */
if (false) {(function () {
  var hotAPI = require("vue-hot-reload-api")
  hotAPI.install(require("vue"), false)
  if (!hotAPI.compatible) return
  module.hot.accept()
  if (!module.hot.data) {
    hotAPI.createRecord("data-v-808a2378", __vue_options__)
  } else {
    hotAPI.reload("data-v-808a2378", __vue_options__)
  }
})()}
if (__vue_options__.functional) {console.error("[vue-loader] menuNav.vue: functional components are not supported and should be defined in plain js files using render functions.")}

module.exports = __vue_exports__


/***/ }),

/***/ 256:
/***/ (function(module, exports, __webpack_require__) {

module.exports={render:function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;
  return _c('div', {
    staticClass: "bar bar-header-secondary buttons-tab"
  }, [_c('router-link', {
    staticClass: "tab-link button",
    class: {
      active: _vm.index == 'friend'
    },
    attrs: {
      "to": {
        name: 'im-friends'
      }
    }
  }, [_vm._v("\n    \t我的好友\n\t")]), _vm._v(" "), _c('router-link', {
    staticClass: "tab-link button",
    class: {
      active: _vm.index == 'index'
    },
    attrs: {
      "to": {
        name: 'im-history'
      }
    }
  }, [_vm._v("\n    \t最近聊天\n\t")])], 1)
},staticRenderFns: []}
if (false) {
  module.hot.accept()
  if (module.hot.data) {
     require("vue-hot-reload-api").rerender("data-v-808a2378", module.exports)
  }
}

/***/ }),

/***/ 257:
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(254);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(246)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../node_modules/css-loader/index.js!../../../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-808a2378&scoped=true!../../../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./menuNav.vue", function() {
			var newContent = require("!!../../../../node_modules/css-loader/index.js!../../../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-808a2378&scoped=true!../../../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./menuNav.vue");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),

/***/ 293:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
//
//
//
//
//
//

/* harmony default export */ __webpack_exports__["default"] = ({

	/**
  * Define props
  */

	props: {
		full: {
			type: Boolean,
			default: true
		},

		horizontal: {
			type: Boolean,
			default: false
		}
	},

	/**
  * Initialize default data
  * 
  * @return {object}
  */

	data: function data() {
		return {
			pageHeight: 0,
			viewportHeight: 0,
			pageWidth: 0,
			viewportWidth: 0,
			duplicates: false,
			isTouch: false
		};
	},


	/**
  * When the component is mounted
  */

	mounted: function mounted() {
		var vm = this;

		//When the window has loaded we're going to work out the dimentions
		window.addEventListener('load', function () {
			vm.getDimensions();
		});

		//When the window is resized we want to re-calculate the dimentions
		window.addEventListener('resize', function () {
			vm.getDimensions();
		}, true);

		//When the element is scrolled
		vm.$el.addEventListener('scroll', function (event) {
			vm.scrollHandler();
		}, true);
	},


	methods: {

		/**
   * Scroll handler
   */

		scrollHandler: function scrollHandler() {
			var container = this.$el;

			if (!this.horizontal) {
				var y = container.scrollTop;
				if (y + this.viewportHeight > this.pageHeight) {
					container.scrollTop = y % this.pageHeight;
				}
			} else {
				var x = container.scrollLeft;
				if (x >= this.pageWidth) {
					container.scrollLeft = x % this.pageWdith;
				}
			}
		},


		/**
   * Get dimentions of the page and viewport
   */

		getDimensions: function getDimensions() {
			var vm = this;
			var container = vm.$el;

			if (vm.duplicates === false) {
				vm.duplicates = vm.makeDuplicates();
			}

			var numOfItems = container.querySelectorAll('.item').length - vm.duplicates;

			for (var i = 0; i < numOfItems; i++) {
				var itemWidth = container.querySelectorAll('.item')[i].clientWidth;
				var itemHeight = container.querySelectorAll('.item')[i].clientHeight;
				vm.pageHeight = vm.pageHeight + itemHeight;
				vm.pageWidth = vm.pageWidth + itemWidth;
			}

			vm.viewportHeight = container.clientHeight;
			vm.viewportWidth = container.clientHeight;
		},


		/**
   * Make duplicates so the scroll is smooth
   */

		makeDuplicates: function makeDuplicates() {
			var container = this.$el;
			if (this.horizontal) {
				var containerSize = container.clientWidth;
				var itemSize = container.childNodes[0].clientWidth;
			}
			if (!this.horizontal) {
				var containerSize = container.clientHeight;
				var itemSize = container.childNodes[0].clientHeight;
			}
			var division = containerSize / itemSize;
			for (var i = 0; i < division + 1; i++) {
				container.appendChild(container.childNodes[i].cloneNode(true));
			}
			return division;
		}
	}
});

/***/ }),

/***/ 296:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//

/* harmony default export */ __webpack_exports__["default"] = ({
	props: ['user_id', 'friends'],
	methods: {
		getAvatar: function getAvatar(v) {
			return v ? '/' + v : '/images/logo.png';
		}
	}
});

/***/ }),

/***/ 320:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_vue_loop__ = __webpack_require__(383);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_vue_loop___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_vue_loop__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__components_history_vue__ = __webpack_require__(386);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__components_history_vue___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1__components_history_vue__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__components_menuNav__ = __webpack_require__(255);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__components_menuNav___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2__components_menuNav__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__components_footNav__ = __webpack_require__(250);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__components_footNav___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_3__components_footNav__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_vue_infinite_loading__ = __webpack_require__(247);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_vue_infinite_loading___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_4_vue_infinite_loading__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_axios__ = __webpack_require__(60);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_axios___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_5_axios__);
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//







/* harmony default export */ __webpack_exports__["default"] = ({
	data: function data() {
		return {
			page: 1,
			user_id: 0,
			'friends': []
		};
	},
	created: function created() {
		console.log('load index');
	},
	mounted: function mounted() {
		var that = this;
		window.conn.listen({
			onTextMessage: function onTextMessage(message) {
				//收到文本消息
				console.log(message);
				console.log('txt');
				message.type = 'txt';
				tipAudio.play();
				console.log(message);
				if (message.to == imUser) {
					that.messages.push(message);
				}
				for (var i in that.friends) {
					if (that.friends[i].receiver.name == message.from || that.friends[i].sender.name == message.from) {
						//如果 是相同的则给信息修改一下

					}
				}
				console.log(message);
			},
			onCmdMessage: function onCmdMessage(message) {
				tipAudio.play();
				console.log('cmd');
				console.log(message);
				var friends = that.friends;
				for (var i in friends) {
					if (friends[i].receiver.name == message.from || friends[i].sender.name == message.from) {
						//如果 是相同的则给信息修改一下
						if (message.ext.action == 'invite_bigsmall') {
							var msg = {
								'data': message.action,
								'type': 'invite_bigsmall',
								'to': message.to,
								'from': message.from,
								'id': message.ext.event_id,
								'msg_id': message.ext.event_id
							};
							friends[i].body.data = msg.data;
							friends[i].type = msg.type;
							friends[i].isNew++;
							that.friends = friends;
						} else {
							var msg = {
								'data': message.ext.worth,
								'type': 'game',
								'to': message.to,
								'from': message.from,
								'id': message.id,
								'msg_id': message.ext.event_id
							};
						}
					}
				}
				console.log(that.friends);
			},
			//当消息发送到服务器
			onReceivedMessage: function onReceivedMessage(message) {},
			onPictureMessage: function onPictureMessage(message) {
				console.log(message);
				tipAudio.play();
				message.type = 'image';
				if (message.to == imUser) {
					that.messages.push(message);
				}
			}

		});
	},
	methods: {
		loadMore: function loadMore($state) {
			var that = this;
			__WEBPACK_IMPORTED_MODULE_5_axios___default.a.get('/im/recent' + '?_token=' + window._Token + '&api_token=' + window.apiToken + '&page=' + that.page, {
				responseType: 'json'
			}).then(function (ret) {
				$state.loaded();
				if (ret.data.errcode === 0) {
					//邀请成功 回到发送信息的页面
					console.log(ret.data);
					that.user_id = ret.data.user.id;
					var friends = [];
					for (var i in ret.data.data.data) {
						ret.data.data.data[i].isNew = 0;
						friends.push(ret.data.data.data[i]);
					}
					that.friends = friends;
					if (ret.data.data.last_page >= that.page) {
						$state.complete();
					} else {
						that.page++;
					}
				}
			}, function (ret) {
				console.log(ret);
			});
		},
		getName: function getName(item) {
			return item.sender_id == 0 ? '系统消息' : this.user_id != item.sender_id ? item.sender.nickname : item.receiver.nickname;
			return item.alias_name ? item.alias_name : item.friend.nickname || '狗运';
		},
		getAvatar: function getAvatar(v) {
			if (!v) {
				return '/images/logo.png';
			}
			return '/' + v;
		},
		makeGameTip: function makeGameTip(item) {
			var that = this;
			var html = "";
			if (that.user_id == item.sender_id) {
				//如果我是发起者
				html = "您向" + that.getName(item) + "发起了比大小战斗，等待他接受战斗！";
			} else {
				//如果是接受者
				html = item.body.data + "向您发起了比大小战斗，是否接受战斗？";
			}
			return html;
		}
	},
	components: {
		'friend': __WEBPACK_IMPORTED_MODULE_1__components_history_vue___default.a,
		'menu-nav': __WEBPACK_IMPORTED_MODULE_2__components_menuNav___default.a,
		'foot-bar': __WEBPACK_IMPORTED_MODULE_3__components_footNav___default.a,
		InfiniteLoading: __WEBPACK_IMPORTED_MODULE_4_vue_infinite_loading___default.a
	}
});

/***/ }),

/***/ 375:
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(11)(false);
// imports


// module
exports.push([module.i, "\n.badge[data-v-c4690ae6] {\n\tbackground: red;\n\tcolor:white;\n}\n", ""]);

// exports


/***/ }),

/***/ 379:
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(11)(false);
// imports


// module
exports.push([module.i, "\n.loop-container {\n\tdisplay: block;\n\toverflow-y: scroll;\n\t-webkit-overflow-scrolling: touch;\n}\n.loop-container.full {\n\tdisplay: -webkit-box;\n\tdisplay: -ms-flexbox;\n\tdisplay: flex;\n\t-webkit-box-orient: vertical;\n\t-webkit-box-direction: normal;\n\t    -ms-flex-direction: column;\n\t        flex-direction: column;\n\t-ms-flex-wrap: nowrap;\n\t    flex-wrap: nowrap;\n\t-webkit-box-align: stretch;\n\t    -ms-flex-align: stretch;\n\t        align-items: stretch;\n\t-webkit-box-pack: start;\n\t    -ms-flex-pack: start;\n\t        justify-content: flex-start;\n\tposition: absolute;\n\ttop: 0px;\n\tbottom: 0px;\n\tleft: 0px;\n\tright: 0px;\n}\n.loop-container.full > .item {\n\tmin-width: 100%;\n\tmin-height: 100%;\n\t-webkit-box-flex: 1;\n\t    -ms-flex: 1;\n\t        flex: 1;\n\t-webkit-backface-visibility: hidden;\n\t        backface-visibility: hidden;\n    -webkit-transform: translate3d(0,0,0);\n            transform: translate3d(0,0,0);\n}\n.loop-container.horizontal {\n\tdisplay: -webkit-box;\n\tdisplay: -ms-flexbox;\n\tdisplay: flex;\n\t-webkit-box-orient: horizontal;\n\t-webkit-box-direction: normal;\n\t    -ms-flex-direction: row;\n\t        flex-direction: row;\n\t-ms-flex-wrap: nowrap;\n\t    flex-wrap: nowrap;\n\toverflow-y: hidden;\n\toverflow-x: scroll;\n}\n.loop-container.full.horizontal > .item {\n\tmin-width: 100%;\n\t-webkit-box-flex: 1;\n\t    -ms-flex: 1;\n\t        flex: 1;\n}\n", ""]);

// exports


/***/ }),

/***/ 383:
/***/ (function(module, exports, __webpack_require__) {

var __vue_exports__, __vue_options__
var __vue_styles__ = {}

/* styles */
__webpack_require__(471)

/* script */
__vue_exports__ = __webpack_require__(293)

/* template */
var __vue_template__ = __webpack_require__(431)
__vue_options__ = __vue_exports__ = __vue_exports__ || {}
if (
  typeof __vue_exports__.default === "object" ||
  typeof __vue_exports__.default === "function"
) {
if (Object.keys(__vue_exports__).some(function (key) { return key !== "default" && key !== "__esModule" })) {console.error("named exports are not supported in *.vue files.")}
__vue_options__ = __vue_exports__ = __vue_exports__.default
}
if (typeof __vue_options__ === "function") {
  __vue_options__ = __vue_options__.options
}
__vue_options__.__file = "/Users/wangfan/Work/webroot/adm/node_modules/vue-loop/VueLoop.vue"
__vue_options__.render = __vue_template__.render
__vue_options__.staticRenderFns = __vue_template__.staticRenderFns

/* hot reload */
if (false) {(function () {
  var hotAPI = require("vue-hot-reload-api")
  hotAPI.install(require("vue"), false)
  if (!hotAPI.compatible) return
  module.hot.accept()
  if (!module.hot.data) {
    hotAPI.createRecord("data-v-d75853f4", __vue_options__)
  } else {
    hotAPI.reload("data-v-d75853f4", __vue_options__)
  }
})()}
if (__vue_options__.functional) {console.error("[vue-loader] VueLoop.vue: functional components are not supported and should be defined in plain js files using render functions.")}

module.exports = __vue_exports__


/***/ }),

/***/ 386:
/***/ (function(module, exports, __webpack_require__) {

var __vue_exports__, __vue_options__
var __vue_styles__ = {}

/* script */
__vue_exports__ = __webpack_require__(296)

/* template */
var __vue_template__ = __webpack_require__(394)
__vue_options__ = __vue_exports__ = __vue_exports__ || {}
if (
  typeof __vue_exports__.default === "object" ||
  typeof __vue_exports__.default === "function"
) {
if (Object.keys(__vue_exports__).some(function (key) { return key !== "default" && key !== "__esModule" })) {console.error("named exports are not supported in *.vue files.")}
__vue_options__ = __vue_exports__ = __vue_exports__.default
}
if (typeof __vue_options__ === "function") {
  __vue_options__ = __vue_options__.options
}
__vue_options__.__file = "/Users/wangfan/Work/webroot/adm/resources/assets/js/components/history.vue"
__vue_options__.render = __vue_template__.render
__vue_options__.staticRenderFns = __vue_template__.staticRenderFns

/* hot reload */
if (false) {(function () {
  var hotAPI = require("vue-hot-reload-api")
  hotAPI.install(require("vue"), false)
  if (!hotAPI.compatible) return
  module.hot.accept()
  if (!module.hot.data) {
    hotAPI.createRecord("data-v-14b87f94", __vue_options__)
  } else {
    hotAPI.reload("data-v-14b87f94", __vue_options__)
  }
})()}
if (__vue_options__.functional) {console.error("[vue-loader] history.vue: functional components are not supported and should be defined in plain js files using render functions.")}

module.exports = __vue_exports__


/***/ }),

/***/ 394:
/***/ (function(module, exports, __webpack_require__) {

module.exports={render:function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;
  return _c('div', _vm._l((_vm.friends), function(item) {
    return _c('router-link', {
      staticClass: "card",
      attrs: {
        "tag": "div",
        "to": {
          name: 'im-chat',
          params: {
            user_id: _vm.user_id == item.receiver_id ? item.receiver_id : item.sender_id
          }
        }
      }
    }, [_c('div', {
      staticClass: "card-content"
    }, [_c('div', {
      staticClass: "list-block media-list"
    }, [_c('ul', [_c('li', {
      staticClass: "item-content"
    }, [_c('div', {
      staticClass: "item-media img-round"
    }, [(_vm.user_id == item.receiver_id) ? _c('img', {
      attrs: {
        "src": _vm.getAvatar(item.receiver ? item.receiver.avatar : ''),
        "width": "44"
      }
    }) : _c('img', {
      attrs: {
        "src": _vm.getAvatar(item.sender ? item.sender.avatar : ''),
        "width": "44"
      }
    })]), _vm._v(" "), _c('div', {
      staticClass: "item-inner"
    }, [_c('div', {
      staticClass: "item-title-row"
    }, [(_vm.user_id == item.receiver_id) ? _c('div', {
      staticClass: "item-title"
    }, [_vm._v(_vm._s(item.receiver ? item.receiver.nickname : '系统消息'))]) : _c('div', {
      staticClass: "item-title"
    }, [_vm._v(_vm._s(item.sender ? item.sender.nickname : '系统消息'))])]), _vm._v(" "), ('txt' == item.type) ? _c('div', {
      staticClass: "item-subtitle"
    }, [_vm._v(_vm._s(item.body.data))]) : _vm._e(), _vm._v(" "), ('addfriend' == item.type) ? _c('div', {
      staticClass: "item-subtitle"
    }, [_vm._v(_vm._s(item.body.data))]) : _vm._e(), _vm._v(" "), ('image' == item.type) ? _c('div', {
      staticClass: "item-subtitle"
    }, [_vm._v("[图片]")]) : _vm._e()])])])])])])
  }))
},staticRenderFns: []}
if (false) {
  module.hot.accept()
  if (module.hot.data) {
     require("vue-hot-reload-api").rerender("data-v-14b87f94", module.exports)
  }
}

/***/ }),

/***/ 426:
/***/ (function(module, exports, __webpack_require__) {

module.exports={render:function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;
  return _c('div', {
    staticClass: "page"
  }, [_c('header', {
    staticClass: "bar bar-nav"
  }, [_c('h1', {
    staticClass: "title"
  }, [_vm._v("最近联系")]), _vm._v(" "), _c('router-link', {
    staticClass: "button button-link button-nav pull-right back",
    attrs: {
      "to": {
        name: 'chat-search-friend'
      },
      "data-transition": "slide-out"
    }
  }, [_c('span', {
    staticClass: "icon icon-search"
  }), _vm._v("\n                加好友\n            ")])], 1), _vm._v(" "), _c('menu-nav', {
    attrs: {
      "index": "index"
    }
  }), _vm._v(" "), _c('foot-bar', {
    attrs: {
      "select": "chat"
    }
  }), _vm._v(" "), _c('div', {
    staticClass: "content"
  }, [_c('div', {
    staticClass: "content-block",
    staticStyle: {
      "margin": "0rem",
      "padding": "0rem"
    }
  }, [_vm._l((_vm.friends), function(item) {
    return _c('router-link', {
      staticClass: "card",
      attrs: {
        "tag": "div",
        "to": {
          name: 'im-chat',
          params: {
            user_id: item.sender_id == 0 ? 0 : (_vm.user_id != item.receiver_id ? item.receiver_id : item.sender_id)
          }
        }
      }
    }, [_c('div', {
      staticClass: "card-content"
    }, [_c('div', {
      staticClass: "list-block media-list"
    }, [_c('ul', [_c('li', {
      staticClass: "item-content"
    }, [_c('div', {
      staticClass: "item-media img-round"
    }, [_c('img', {
      attrs: {
        "src": _vm.getAvatar(item.sender && _vm.user_id != item.sender.id ? item.sender.avatar : item.receiver.avatar),
        "width": "44"
      }
    })]), _vm._v(" "), _c('div', {
      staticClass: "item-inner"
    }, [_c('div', {
      staticClass: "item-title-row"
    }, [_c('div', {
      staticClass: "item-title",
      staticStyle: {
        "width": "100%"
      }
    }, [_vm._v("\n\t\t\t\t                \t" + _vm._s(item.sender_id == 0 ? '系统消息' : (_vm.user_id != item.sender_id ? item.sender.nickname : item.receiver.nickname)) + "\n\t\t\t\t                \t"), (item.isNew) ? _c('span', {
      staticClass: "badge pull-right"
    }, [_vm._v(_vm._s(item.isNew || 0))]) : _vm._e()])]), _vm._v(" "), ('txt' == item.type) ? _c('div', {
      staticClass: "item-subtitle"
    }, [_vm._v(_vm._s(item.body.data))]) : _vm._e(), _vm._v(" "), ('addfriend' == item.type) ? _c('div', {
      staticClass: "item-subtitle"
    }, [_vm._v(_vm._s(item.body.data))]) : _vm._e(), _vm._v(" "), ('invite_bigsmall' == item.type) ? _c('div', {
      staticClass: "item-subtitle",
      domProps: {
        "innerHTML": _vm._s(_vm.makeGameTip(item))
      }
    }) : _vm._e(), _vm._v(" "), ('image' == item.type) ? _c('div', {
      staticClass: "item-subtitle"
    }, [_vm._v("[图片]")]) : _vm._e()])])])])])])
  }), _vm._v(" "), _c('infinite-loading', {
    ref: "infiniteLoading",
    on: {
      "infinite": _vm.loadMore
    }
  }, [_c('span', {
    attrs: {
      "slot": "no-more"
    },
    slot: "no-more"
  }), _vm._v(" "), _c('span', {
    attrs: {
      "slot": "no-result"
    },
    slot: "no-result"
  })])], 2)])], 1)
},staticRenderFns: []}
if (false) {
  module.hot.accept()
  if (module.hot.data) {
     require("vue-hot-reload-api").rerender("data-v-c4690ae6", module.exports)
  }
}

/***/ }),

/***/ 431:
/***/ (function(module, exports, __webpack_require__) {

module.exports={render:function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;
  return _c('div', {
    staticClass: "loop-container",
    class: {
      'full': _vm.full, 'horizontal': _vm.horizontal
    }
  }, [_vm._t("default")], 2)
},staticRenderFns: []}
if (false) {
  module.hot.accept()
  if (module.hot.data) {
     require("vue-hot-reload-api").rerender("data-v-d75853f4", module.exports)
  }
}

/***/ }),

/***/ 467:
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(375);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(246)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js!../../../../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-c4690ae6&scoped=true!../../../../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./history.vue", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js!../../../../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-c4690ae6&scoped=true!../../../../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./history.vue");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),

/***/ 471:
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(379);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(246)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../css-loader/index.js!../vue-loader/lib/style-rewriter.js?id=data-v-d75853f4!../vue-loader/lib/selector.js?type=styles&index=0!./VueLoop.vue", function() {
			var newContent = require("!!../css-loader/index.js!../vue-loader/lib/style-rewriter.js?id=data-v-d75853f4!../vue-loader/lib/selector.js?type=styles&index=0!./VueLoop.vue");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),

/***/ 86:
/***/ (function(module, exports, __webpack_require__) {

var __vue_exports__, __vue_options__
var __vue_styles__ = {}

/* styles */
__webpack_require__(467)

/* script */
__vue_exports__ = __webpack_require__(320)

/* template */
var __vue_template__ = __webpack_require__(426)
__vue_options__ = __vue_exports__ = __vue_exports__ || {}
if (
  typeof __vue_exports__.default === "object" ||
  typeof __vue_exports__.default === "function"
) {
if (Object.keys(__vue_exports__).some(function (key) { return key !== "default" && key !== "__esModule" })) {console.error("named exports are not supported in *.vue files.")}
__vue_options__ = __vue_exports__ = __vue_exports__.default
}
if (typeof __vue_options__ === "function") {
  __vue_options__ = __vue_options__.options
}
__vue_options__.__file = "/Users/wangfan/Work/webroot/adm/resources/assets/js/pages/im/history.vue"
__vue_options__.render = __vue_template__.render
__vue_options__.staticRenderFns = __vue_template__.staticRenderFns
__vue_options__._scopeId = "data-v-c4690ae6"

/* hot reload */
if (false) {(function () {
  var hotAPI = require("vue-hot-reload-api")
  hotAPI.install(require("vue"), false)
  if (!hotAPI.compatible) return
  module.hot.accept()
  if (!module.hot.data) {
    hotAPI.createRecord("data-v-c4690ae6", __vue_options__)
  } else {
    hotAPI.reload("data-v-c4690ae6", __vue_options__)
  }
})()}
if (__vue_options__.functional) {console.error("[vue-loader] history.vue: functional components are not supported and should be defined in plain js files using render functions.")}

module.exports = __vue_exports__


/***/ })

});