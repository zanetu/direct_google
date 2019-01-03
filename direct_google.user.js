// ==UserScript==
// @name         Direct Google
// @namespace    http://userscripts.org/users/92143
// @version      3.7
// @description  Removes Google redirects and exposes "Cached" links. 
// @include      /^https?\:\/\/(www|news|maps|docs|cse|encrypted|mail)\.google\./
// @author       zanetu
// @license      GPL version 2 or any later version; http://www.gnu.org/licenses/gpl-2.0.txt
// @require      http://cdnjs.cloudflare.com/ajax/libs/jquery/1.8.3/jquery.min.js
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

var hostname = location.hostname
var pathname = location.pathname
var href = location.href

String.prototype.contains = function(s) {
	return -1 !== this.indexOf(s)
}

String.prototype.startsWith = function(s) {
	return this.slice(0, s.length) == s
}

function stopBubbling(event) {
	event.stopPropagation()
}

function blockListeners(element, events) {
	if(!(element instanceof EventTarget && typeof events === 'string')) {
		return
	}
	var eventList = events.split(/\W+/) || []
	for(var i = 0, event; event = eventList[i]; i++) {
		//removeEventListener is not needed as duplicate listeners would be discarded
		element.addEventListener(event, stopBubbling, true)
	}
}

function handleChange() {
	//remove web/video search redirects; does not remove redirects of advertisement
	$('a[onmousedown^="return rwt("]').removeAttr('onmousedown')
	//remove web/video safe-browsing redirects
	$('a[href^="/interstitial?"]').each(function() {
		var m = $(this).attr('href').match(/(?:\?|\&)url\=([^\&]+)/i)
		if(m && m[1]) {
			this.href = decodeURIComponent(m[1])
			//warning prefix
			if(!$(this).index()) {
				$('<span title="Unsafe">&#9888</span>')
				//news with pictures
				.css('float', 'left')
				.insertBefore(this)
			}
		}
	})
	//remove custom search redirects
	$('.gsc-results a[href][data-cturl]').each(function() {
		blockListeners(this, 'mousedown')
	})
	//remove image search redirects
	$('a').filter('[class^="irc_"], [class*=" irc_"], [id^="irc_"]').each(function() {
		blockListeners(this, 'mousedown')
	})
	//remove some news search redirects; does not remove redirects of non-news
	if(href.contains('tbm=nws') || hostname.startsWith('news.google.')) {
		$('a[href^="./articles/"]').attr('href', function(i, v) {
			try {
				var m = atob(v.split(/[\/\?\_\-]/)[2]).match(/http[\x00-\x7F]+/)
			}
			catch(e) {
				//atob failure: "The string to be decoded is not correctly encoded."
				return v
			}
			return m && m[0] || v
		})
	}
	//remove map search redirects; does not remove redirects of advertisement
	else if(pathname.startsWith('/maps/') || '/maps' == pathname) {
		$('a[href^="http"]').each(function() {
			blockListeners(this, 'click contextmenu')
			//legacy
			if(this.href.contains('url?')) {
				var m = this.href.match(/(?:\&|\?)q\=(http.*?)(\&|$)/i)
				if(m && m[1]) {
					this.href = decodeURIComponent(m[1])
				}
			}
		})
	}
	//remove mail/gmail redirects
	else if(hostname.startsWith('mail.')) {
		$('a[data-saferedirecturl]').removeAttr('data-saferedirecturl')
	}
	//remove legacy search redirects and docs redirects
	$('a[href*="/url?"]').each(function() {
		var m = this.href.match(/\/url\?(?:url|q)\=(http.*?)(\&|$)/i)
		if(m && m[1]) {
			this.href = decodeURIComponent(m[1])
		}
	})
	//expose cached links
	$('div[role="menu"] ol li').find('a[href^="http://webcache.googleusercontent."]' + 
		', a[href^="https://webcache.googleusercontent."]').each(
		function() {
			this.style.display = 'inline'
			this.style.marginRight = '0.5em'
			$(this).closest('div.action-menu.ab_ctl, div._nBb')
			.after($(this))
			//material design
			.parent().css('white-space', 'nowrap')
		}
	)
}

var mo = window.MutationObserver || window.WebKitMutationObserver
if(mo) {
	var observer = new mo(handleChange)
	observer.observe(document.documentElement, {childList: true, subtree: true})
}
//for chrome v18-, firefox v14-, internet explorer v11-, opera v15- and safari v6-
else {
	setInterval(handleChange, 500)
}
handleChange()