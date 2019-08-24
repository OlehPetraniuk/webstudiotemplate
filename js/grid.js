var $event = $.event,
$special,
resizeTimeout;

$special = $event.special.debouncedresize = {
	setup: function() {
		$( this ).on( "resize", $special.handler );
	},
	teardown: function() {
		$( this ).off( "resize", $special.handler );
	},
	handler: function( event, execAsap ) {
		// Save the context
		var context = this,
			args = arguments,
			dispatch = function() {
				// set correct event type
				event.type = "debouncedresize";
				$event.dispatch.apply( context, args );
			};

		if ( resizeTimeout ) {
			clearTimeout( resizeTimeout );
		}

		execAsap ?
			dispatch() :
			resizeTimeout = setTimeout( dispatch, $special.threshold );
	},
	threshold: 250
};

var BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

$.fn.imagesLoaded = function( callback ) {
	var $this = this,
		deferred = $.isFunction($.Deferred) ? $.Deferred() : 0,
		hasNotify = $.isFunction(deferred.notify),
		$images = $this.find('img').add( $this.filter('img') ),
		loaded = [],
		proper = [],
		broken = [];

	// Register deferred callbacks
	if ($.isPlainObject(callback)) {
		$.each(callback, function (key, value) {
			if (key === 'callback') {
				callback = value;
			} else if (deferred) {
				deferred[key](value);
			}
		});
	}

	function doneLoading() {
		var $proper = $(proper),
			$broken = $(broken);

		if ( deferred ) {
			if ( broken.length ) {
				deferred.reject( $images, $proper, $broken );
			} else {
				deferred.resolve( $images );
			}
		}

		if ( $.isFunction( callback ) ) {
			callback.call( $this, $images, $proper, $broken );
		}
    }
    function imgLoaded( img, isBroken ) {
		// don't proceed if BLANK image, or image is already loaded
		if ( img.src === BLANK || $.inArray( img, loaded ) !== -1 ) {
			return;
		}

		// store element in loaded images array
		loaded.push( img );

		// keep track of broken and properly loaded images
		if ( isBroken ) {
			broken.push( img );
		} else {
			proper.push( img );
		}

		// cache image and its state for future calls
		$.data( img, 'imagesLoaded', { isBroken: isBroken, src: img.src } );

		// trigger deferred progress method if present
		if ( hasNotify ) {
			deferred.notifyWith( $(img), [ isBroken, $images, $(proper), $(broken) ] );
		}

		// call doneLoading and clean listeners if all images are loaded
		if ( $images.length === loaded.length ){
			setTimeout( doneLoading );
			$images.unbind( '.imagesLoaded' );
		}
	}

	// if no images, trigger immediately
	if ( !$images.length ) {
		doneLoading();
	} else {
		$images.bind( 'load.imagesLoaded error.imagesLoaded', function( event ){
			// trigger imgLoaded
			imgLoaded( event.target, event.type === 'error' );
		}).each( function( i, el ) {
			var src = el.src;

			// find out if this image has been already checked for status
			// if it was, and src has not changed, call imgLoaded on it
			var cached = $.data( el, 'imagesLoaded' );
			if ( cached && cached.src === src ) {
				imgLoaded( el, cached.isBroken );
				return;
			}

			// if complete is true and browser supports natural sizes, try
			// to check for image status manually
			if ( el.complete && el.naturalWidth !== undefined ) {
				imgLoaded( el, el.naturalWidth === 0 || el.naturalHeight === 0 );
				return;
			}

			// cached images don't fire load sometimes, so we reset src, but only when
			// dealing with IE, or image is complete (loaded) and failed manual check
			// webkit hack from http://groups.google.com/group/jquery-dev/browse_thread/thread/eee6ab7b2da50e1f
			if ( el.readyState || el.complete ) {
				el.src = BLANK;
				el.src = src;
			}
		});
	}

	return deferred ? deferred.promise( $this ) : $this;
};

var Grid = (function() {

    // list of items
var $grid = $( '#og-grid' ),
    // the items
    $items = $grid.children( 'li' ),
    // current expanded item's index
    current = -1,
    // position (top) of the expanded item
    // used to know if the preview will expand in a different row
    previewPos = -1,
    // extra amount of pixels to scroll the window
    scrollExtra = 0,
    // extra margin when expanded (between preview overlay and the next items)
    marginExpanded = 10,
    $window = $( window ), winsize,
    $body = $( 'html, body' ),
    // transitionend events
    transEndEventNames = {
        'WebkitTransition' : 'webkitTransitionEnd',
        'MozTransition' : 'transitionend',
        'OTransition' : 'oTransitionEnd',
        'msTransition' : 'MSTransitionEnd',
        'transition' : 'transitionend'
    },
    transEndEventName = transEndEventNames[ Modernizr.prefixed( 'transition' ) ],
    // support for csstransitions
    support = Modernizr.csstransitions,
    // default settings
    settings = {
        minHeight : 500,
        speed : 350,
        easing : 'ease'
    };

function init( config ) {

    // the settings..
    settings = $.extend( true, {}, settings, config );

    // preload all images
    $grid.imagesLoaded( function() {

        // save item´s size and offset
        saveItemInfo( true );
        // get window´s size
        getWinSize();
        // initialize some events
        initEvents();

    } );

}

// saves the item´s offset top and height (if saveheight is true)
function saveItemInfo( saveheight ) {
    $items.each( function() {
        var $item = $( this );
        $item.data( 'offsetTop', $item.offset().top );
        if( saveheight ) {
            $item.data( 'height', $item.height() );
        }
    } );
}

function initEvents() {

    // when clicking an item, show the preview with the item´s info and large image.
    // close the item if already expanded.
    // also close if clicking on the item´s cross
    $items.on( 'click', 'span.og-close', function() {
        hidePreview();
        return false;
    } ).children( 'a' ).on( 'click', function(e) {

        var $item = $( this ).parent();
        // check if item already opened
        current === $item.index() ? hidePreview() : showPreview( $item );
        return false;

    } );
