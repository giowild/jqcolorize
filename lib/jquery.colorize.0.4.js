;(function( $ ){

    // Create a closure
    (function(){
        
        // Your base, I'm in it!
        var originalAddClassMethod = jQuery.fn.addClass;

        jQuery.fn.addClass = function(){
            // Execute the original method.
            originalAddClassMethod.apply( this, arguments );

            jQuery(this).trigger('cssClassChanged', arguments)
        };
        // Your base, I'm in it!
        var originalRemoveClassMethod = jQuery.fn.removeClass;

        jQuery.fn.removeClass = function(){
            // Execute the original method.
            originalRemoveClassMethod.apply( this, arguments );

            jQuery(this).trigger('cssClassChanged', arguments)
        };

        // Your base, I'm in it!
        /*var originalToggleClassMethod = jQuery.fn.toggleClass;

        jQuery.fn.toggleClass = function(){
            // Execute the original method.
            originalToggleClassMethod.apply( this, arguments );

            jQuery(this).trigger('cssClassChanged', arguments)
        }   ; */    
    })();

    jQuery('*').live('cssClassChanged',function(e,args){
        var $e = $(this),
            classes = $e.attr('class');
            
        if (args.indexOf('colorize-')!=-1) {
            $e.colorize('filter', classes);
        }
        e.stopPropagation();
    });

    String.prototype.startsWith = function( eString)
    {   
        var reg = new RegExp( "^" + eString);
        return reg.test( this);
    };

    var options = {
        'duration' : 0,
        'opacity' : 1,
        /*'location'         : 'top',
        'background-color' : 'blue'*/
    },
    filters = ['blur','emboss','greyscale','matrix','mosaic', 'noise','posterize','sepia','sharpen','tint'],
    // create the params object and set some default parameters up front
    filterParams = {
        "blurAmount"        :    1,        // 0 and higher
        "embossAmount"        :    0.2,    // between 0 and 1
        "greyscaleOpacity"    :    1,        // between 0 and 1
        "matrixAmount"        :    0.2,    // between 0 and 1
        "mosaicOpacity"        :    1,        // between 0 and 1
        "mosaicSize"        :    5,        // 1 and higher
        "noiseAmount"        :    30,        // 0 and higher
        "noiseType"            :    "mono",    // mono or color
        "posterizeAmount"    :    5,        // 0 - 255, though 0 and 1 are relatively useless
        "posterizeOpacity"    :    1,        // between 0 and 1
        "sepiaOpacity"        :    1,        // between 0 and 1
        "sharpenAmount"        :    0.2,    // between 0 and 1
        "tintColor"            :    "#FFF",    // any hex color
        "tintOpacity"        :    0.3        // between 0 and 1
    },
    $canvas = $("<canvas />").get(0),
    c = $canvas.getContext('2d');

    
    
    
    var methods = {
        init : function( options ) {

            return this.each(function(){
                var $this = $(this),
                data = $this.data('colorize'),
                imageSource = this.nodeName=="IMG"?this.src:this.style.backgroundImage;

                // If the plugin hasn't been initialized yet
                if ( ! data ) {
                    $this.data('colorize', {
                        target : this,
                        imageSource : imageSource
                    });

                }
            });
        },
        destroy : function( ) {

            return this.each(function(){

                var $this = $(this),
                data = $this.data('colorize');

                // TODO: GL verificare se sono necessarie le istruzioni qui sotto
                // Namespacing FTW
                /*$(window).unbind('.colorize');
                data.imageSource.remove();
                $this.removeData('imageSource');*/

            })

        },
        applyf : function () { //apply filters from classes

        },
        filter : function (ftype, fparams) {  // apply specified filter to selected element

            $canvas = $("<canvas />").get(0),
            c = $canvas.getContext('2d');
            var fltParams = $.extend({}, filterParams, fparams);

            return this.each(function(idx,ref){

                var $this = $(this),
                    data = $this.data('colorize'),
                    buffer=$canvas;

                // If the plugin hasn't been initialized yet
                if ( ! data ) {
                    data = { target : this, imageSource : this.nodeName=="IMG"?this.src:this.style.backgroundImage };
                    $this.data('colorize', data);
                }
                
                var params = fltParams,
                    classes = ftype||"",
                    dest = null,
                    target = data.target;

                // Posterize requires a couple more generated values, lets keep them out of the loop
                
                if (target.nodeName == "IMG") {
                    target.src = data.imageSource
                } else {
                    target.style.backgroundImage = data.imageSource;
                }
                var img = target;

                // set buffer dimensions to image dimensions
                c.width = buffer.width = img.width;
                c.height = buffer.height = img.height;
                if (img && c) {
                    // create the temporary pixel array we'll be manipulating
                    var filtersToApply = [], 
                        filtersWithParams = [],
                        timestart = microtime(true),
                        timeend = timestart,
                        z = 0;
                    
                    $.each(classes.split(' '),function(idx,filter){
                        
                        //data-pb-blur-amount="0.5" 0-1
                        //data-pb-emboss-amount="0.5" 0-1
                        //data-pb-edges-amount="0.5" 0-1
                        //data-pb-greyscale-opacity="0.5" 0-1
                        
                        //data-pb-edges-amount="0.5" 0-255
                        //data-pb-greyscale-opacity="0.5" 0-1

                        //data-pb-sepia-opacity="0.5" 0-1

                        //data-pb-sharpen-opacity="0.5" 0-1
                        
                        //data-pb-tint-opacity="0.5" 0-1
                        //data-pb-tint-colour=#ffffff

                        //data-pb-mosaic-opacity="1" 0-1
                        //data-pb-mosaic-size="2" 1-*
                        
                        //data-pb-noise-amount="30"     0-*
                        // data-pb-noise-type="mono"    mono|color
                        
                        
                        var fs = filter.split('-');
                        if (fs.length > 1 && fs[0]=="colorize" && $.inArray(fs[1], filters)!=-1) {
                            filtersToApply[z] = fs[1] + (fs[2]?'-'+fs[2]:"") + (fs[3]?'-'+fs[3]:"") ;
                            filtersWithParams[z++]={
                                name : fs[1],
                                p0 : fs[2]||false,
                                p1 : fs[3]||false
                            };
                        }
                    });

                    var bufferstring = filtersToApply.length>0? $this.data('colorize_'+hex_md5(filtersToApply.join(' '))) : data.imageSource;

                    if (!bufferstring) {
                        var pixels = initializeBuffer(c, img);
                        // filters processing loop
                        $.each(filtersWithParams,function(idx,filter){
                                
                            //                    
                            // pre-processing for various filters
                            //
                            // blur and all matrix filters have to exist outside the main loop
                            if (filter.name == "blur") {
                                pixels = gaussianBlur(img, pixels, filter.p0?parseFloat(filter.p0):params.blurAmount);
                            }
                            if (filter.name == "emboss") {
                                var matrix = [
                                -2,        -1,        0,
                                -1,        1,        1,
                                0,        1,        2
                                ];
                                pixels = applyMatrix(img, pixels, matrix, filter.p0?parseFloat(filter.p0):params.embossAmount);
                            }
                            if (filter.name == "matrix") {
                                // 3x3 matrix can be any combination of digits, though to maintain brightness they should add up to 1
                                // (-1 x 8 + 9 = 1)

                                var matrix = [
                                // box blur default
                                0.111,        0.111,        0.111,
                                0.111,        0.111,        0.111,
                                0.111,        0.111,        0.111
                                ];
                                pixels = applyMatrix(img, pixels, matrix, filter.p0?parseFloat(filter.p0):params.matrixAmount);
                            }
                            if (filter.name == "sharpen") {
                                var matrix = [
                                -1,        -1,        -1,
                                -1,        9,        -1,
                                -1,        -1,        -1
                                ];
                                pixels = applyMatrix(img, pixels, matrix, filter.p0?parseFloat(filter.p0):params.sharpenAmount);
                            }

                            // we need to figure out RGB values for tint, let's do that ahead and not waste time in the loop
                            if (filter.name == "tint") {
                                var src  = parseInt(createColor(filter.p0?filter.p0:params.tintColor), 16),
                                dest = {r: ((src & 0xFF0000) >> 16), g: ((src & 0x00FF00) >> 8), b: (src & 0x0000FF)};
                            }
                            if ((filter.name != "blur") 
                            && (filter.name != "emboss")
                            && (filter.name != "matrix")
                            && (filter.name != "sharpen")
                            ) {
                                // the main loop through every pixel to apply the simpler effects
                                // (data is per-byte, and there are 4 bytes per pixel, so lets only loop through each pixel and save a few cycles)
                                var op, val, am, ms, nt,imgWidth = img.width;
                                switch (filter.name){
                                    case "greyscale":
                                        op = filter.p0?parseFloat(filter.p0):params.greyscaleOpacity;
                                        for (var i = 0, length = pixels.data.length; i < length >> 2; i++) {
                                            var index = i << 2,
                                                thisPixel = {r: pixels.data[index], g: pixels.data[index + 1], b: pixels.data[index + 2]};
                                            // the biggie: if we're here, let's get some filter action happening
                                            val = (thisPixel.r * 0.21) + (thisPixel.g * 0.71) + (thisPixel.b * 0.07);
                                            pixels.data[index] = op * val + (1 - op) * thisPixel.r;
                                            pixels.data[index+1] = op * val + (1 - op) * thisPixel.g;
                                            pixels.data[index+2] = op * val + (1 - op) * thisPixel.b;
                                        }
                                        break;

                                    case "mosaic":
                                        // a bit more verbose to reduce amount of math necessary
                                        ms = filter.p1?parseFloat(filter.p1):params.mosaicSize;
                                        op = filter.p0?parseFloat(filter.p0):params.mosaicOpacity;
                                        for (var i = 0, length = pixels.data.length; i < length >> 2; i++) {
                                            var index = i << 2,
                                                thisPixel = {r: pixels.data[index], g: pixels.data[index + 1], b: pixels.data[index + 2]},
                                                pos = index >> 2,
                                                stepY = Math.floor(pos / imgWidth),
                                                stepY1 = stepY % ms,
                                                stepX = pos - (stepY * imgWidth),
                                                stepX1 = stepX % ms;

                                            if (stepY1) pos -= stepY1 * imgWidth;
                                            if (stepX1) pos -= stepX1;
                                            pos = pos << 2;
                                                                                    
                                            pixels.data[index] = op * pixels.data[pos] + (1 - op) * thisPixel.r;
                                            pixels.data[index+1] = op * pixels.data[pos+1] + (1 - op) * thisPixel.g;
                                            pixels.data[index+2] = op * pixels.data[pos+2] + (1 - op) * thisPixel.b;
                                        }
                                        break;

                                    case "noise":
                                        nt = filter.p1?filter.p1:params.noiseType;
                                        am = filter.p0?parseFloat(filter.p0):params.noiseAmount;
                                        val = noise(am);

                                        if ((nt == "mono") || ( nt == "monochrome")) {
                                            data = setRGB(data, index, 
                                            checkRGBBoundary(thisPixel.r + val),
                                            checkRGBBoundary(thisPixel.g + val),
                                            checkRGBBoundary(thisPixel.b + val));
                                        } else {
                                            data = setRGB(data, index, 
                                            checkRGBBoundary(thisPixel.r + noise(am)),
                                            checkRGBBoundary(thisPixel.g + noise(am)),
                                            checkRGBBoundary(thisPixel.b + noise(am)));
                                        }
                                    break;

                                    case "posterize":
                                        am = filter.p0?parseFloat(filter.p0):params.posterizeAmount;
                                        op = filter.p1?parseFloat(filter.p1):params.posterizeOpacity;
                                        var posterizeAreas = 256 / am,
                                            posterizeValues = 255 / (am - 1);

                                        for (var i = 0, length = pixels.data.length; i < length >> 2; i++) {
                                            var index = i << 2,
                                                thisPixel = {r: pixels.data[index], g: pixels.data[index + 1], b: pixels.data[index + 2]};
                                            pixels.data[index] = op * parseInt(posterizeValues * parseInt(thisPixel.r / posterizeAreas)) + (1 - op) * thisPixel.r;
                                            pixels.data[index+1] = op * parseInt(posterizeValues * parseInt(thisPixel.g / posterizeAreas)) + (1 - op) * thisPixel.g;
                                            pixels.data[index+2] = op * parseInt(posterizeValues * parseInt(thisPixel.b / posterizeAreas)) + (1 - op) * thisPixel.b;
                                        }
                                        break;

                                    case "sepia":
                                        op = filter.p0?parseFloat(filter.p0):params.sepiaOpacity;
                                        for (var i = 0, length = pixels.data.length; i < length >> 2; i++) {
                                            var index = i << 2,
                                                thisPixel = {r: pixels.data[index], g: pixels.data[index + 1], b: pixels.data[index + 2]};
                                            pixels.data[index] = op * ((thisPixel.r * 0.393) + (thisPixel.g * 0.769)) + (thisPixel.b * 0.189) + (1 - op) * thisPixel.r;
                                            pixels.data[index+1] = op * ((thisPixel.r * 0.349) + (thisPixel.g * 0.686)) + (1 - op) * thisPixel.g;
                                            pixels.data[index+2] = op * ((thisPixel.r * 0.272) + (thisPixel.g * 0.534)) + (1 - op) * thisPixel.b;
                                        }
                                        break;

                                    case "tint":
                                        op = filter.p1?parseFloat(filter.p1):params.tintOpacity;
                                        for (var i = 0, length = pixels.data.length; i < length >> 2; i++) {
                                            var index = i << 2,
                                                thisPixel = {r: pixels.data[index], g: pixels.data[index + 1], b: pixels.data[index + 2]};
                                            pixels.data[index] = op * dest.r + (1 - op) * thisPixel.r;
                                            pixels.data[index+1] = op * dest.g + (1 - op) * thisPixel.g;
                                            pixels.data[index+2] = op * dest.b + (1 - op) * thisPixel.b;
                                        }
                                        break;
                                }

                                /*for (var i = 0, data = pixels.data, length = data.length; i < length >> 2; i++) {
                                    var index = i << 2;
                                    // get each colour value of current pixel
                                    var thisPixel = {r: data[index], g: data[index + 1], b: data[index + 2]};
                                    // the biggie: if we're here, let's get some filter action happening
                                    val = (data[index] * 0.21) + (data[index+1] * 0.71) + (data[index+2] * 0.07);
                                    switch(filter.name) {
                                        case "greyscale":
                                        pixels.data[index] = op * val + (1 - op) * data[index];
                                        pixels.data[index+1] = op * val + (1 - op) * data[index+1];
                                        pixels.data[index+2] = op * val + (1 - op) * data[index+2];                          
                                        break;
                                    }
     
                                    
                                    //pixels = applyFilters(filter, params, img, pixels, index, thisPixel, dest);
                                    
                                    
                                    
                                }*/
                            }
                        });

                        // redraw the pixel data back to the working buffer
                        c.putImageData(pixels, 0, 0);

                        bufferstring = buffer.toDataURL("image/png");                        
                        $this.data('colorize_'+hex_md5(filtersToApply.join(' ')), bufferstring);
                    }

                    // dump the buffer as a DataURL
                    if (ref.nodeName == "IMG") {
                        ref.src = bufferstring
                        //img.src = result;
                    } else {
                        ref.style.backgroundImage = "url(" + bufferstring + ")";
                    }
                    
                    timeend = microtime(true);
                    console.log(timeend-timestart);
                    
                }

            });


        }
        /*reposition : function( ) { // ... },
        show : function( ) { // ... },
        hide : function( ) { // ... },
        update : function( content ) { // ...}*/
    };

    $.fn.colorize = function( method ) {

        if ( methods[method] ) {
            return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
        } else if ( typeof method === 'object' || ! method ) {
            return methods.init.apply( this, arguments );
        } else {
            $.error( 'Method ' +  method + ' does not exist on jQuery.colorize' );
        }    

    };

    function microtime(get_as_float) {  
        // Returns either a string or a float containing the current time in seconds and microseconds    
        //   
        // version: 812.316  
        // discuss at: http://phpjs.org/functions/microtime  
        // +   original by: Paulo Ricardo F. Santos  
        // *     example 1: timeStamp = microtime(true);  
        // *     results 1: timeStamp > 1000000000 && timeStamp < 2000000000  
        var now = new Date().getTime() / 1000;  
        var s = parseInt(now);  
      
        return (get_as_float) ? now : (Math.round((now - s) * 1000) / 1000) + ' ' + s;  
    }      
    
    // the function that actually manipulates the pixels
    function applyFilters(filter, params, img, pixels, index, thisPixel, dest) {

        // speed up access
        var data = pixels.data, val, 
            op, am, nt, ms,
            imgWidth = img.width;

        // figure out which filter to apply, and do it    
        switch(filter.name) {

            case "greyscale":
                op = filter.p0?parseFloat(filter.p0):params.greyscaleOpacity;
                val = (thisPixel.r * 0.21) + (thisPixel.g * 0.71) + (thisPixel.b * 0.07);
                
                data[index] = op * val + (1 - op) * thisPixel.r;
                data[index+1] = op * val + (1 - op) * thisPixel.g;
                data[index+2] = op * val + (1 - op) * thisPixel.b;
                /*data = setRGB(data, index, 
                findColorDifference(op, val, thisPixel.r),
                findColorDifference(op, val, thisPixel.g),
                findColorDifference(op, val, thisPixel.b));*/
                break;

            case "mosaic":
                // a bit more verbose to reduce amount of math necessary
                ms = filter.p1?parseFloat(filter.p1):params.mosaicSize;
                op = filter.p0?parseFloat(filter.p0):params.mosaicOpacity;
                var pos = index >> 2,
                    stepY = Math.floor(pos / imgWidth),
                    stepY1 = stepY % ms,
                    stepX = pos - (stepY * imgWidth),
                    stepX1 = stepX % ms;

                if (stepY1) pos -= stepY1 * imgWidth;
                if (stepX1) pos -= stepX1;
                pos = pos << 2;

                data = setRGB(data, index,
                findColorDifference(op, data[pos], thisPixel.r),
                findColorDifference(op, data[pos + 1], thisPixel.g),
                findColorDifference(op, data[pos + 2], thisPixel.b));
                break;

            case "noise":
                nt = filter.p1?filter.p1:params.noiseType;
                am = filter.p0?parseFloat(filter.p0):params.noiseAmount;
                val = noise(am);

                if ((nt == "mono") || ( nt == "monochrome")) {
                    data = setRGB(data, index, 
                    checkRGBBoundary(thisPixel.r + val),
                    checkRGBBoundary(thisPixel.g + val),
                    checkRGBBoundary(thisPixel.b + val));
                } else {
                    data = setRGB(data, index, 
                    checkRGBBoundary(thisPixel.r + noise(am)),
                    checkRGBBoundary(thisPixel.g + noise(am)),
                    checkRGBBoundary(thisPixel.b + noise(am)));
                }
            break;

            case "posterize":
                am = filter.p0?parseFloat(filter.p0):params.posterizeAmount;
                op = filter.p1?parseFloat(filter.p1):params.posterizeOpacity;
                var posterizeAreas = 256 / am,
                    posterizeValues = 255 / (am - 1);
                
                data = setRGB(data, index, 
                findColorDifference(op, parseInt(posterizeValues * parseInt(thisPixel.r / posterizeAreas)), thisPixel.r),
                findColorDifference(op, parseInt(posterizeValues * parseInt(thisPixel.g / posterizeAreas)), thisPixel.g),
                findColorDifference(op, parseInt(posterizeValues * parseInt(thisPixel.b / posterizeAreas)), thisPixel.b));
                break;

            case "sepia":
                op = filter.p0?parseFloat(filter.p0):params.sepiaOpacity;
                data = setRGB(data, index, 
                findColorDifference(op, (thisPixel.r * 0.393) + (thisPixel.g * 0.769) + (thisPixel.b * 0.189), thisPixel.r),
                findColorDifference(op, (thisPixel.r * 0.349) + (thisPixel.g * 0.686) + (thisPixel.b * 0.168), thisPixel.g),
                findColorDifference(op, (thisPixel.r * 0.272) + (thisPixel.g * 0.534) + (thisPixel.b * 0.131), thisPixel.b));
                break;

            case "tint":
                op = filter.p1?parseFloat(filter.p1):params.tintOpacity;
                data = setRGB(data, index, 
                findColorDifference(op, dest.r, thisPixel.r),
                findColorDifference(op, dest.g, thisPixel.g),
                findColorDifference(op, dest.b, thisPixel.b));
                break;


        }
        return(pixels);
    }


    // calculate gaussian blur
    // adapted from http://pvnick.blogspot.com/2010/01/im-currently-porting-image-segmentation.html
    function gaussianBlur(img, pixels, amount) {

        var width = img.width;
        var width4 = width << 2;
        var height = img.height;
        
        if (pixels) {
            var data = pixels.data;
            
            // compute coefficients as a function of amount
            var q;
            if (amount < 0.0) {
                amount = 0.0;
            }
            if (amount >= 2.5) {
                q = 0.98711 * amount - 0.96330; 
            } else if (amount >= 0.5) {
                q = 3.97156 - 4.14554 * Math.sqrt(1.0 - 0.26891 * amount);
            } else {
                q = 2 * amount * (3.97156 - 4.14554 * Math.sqrt(1.0 - 0.26891 * 0.5));
            }
            
            //compute b0, b1, b2, and b3
            var qq = q * q;
            var qqq = qq * q;
            var b0 = 1.57825 + (2.44413 * q) + (1.4281 * qq ) + (0.422205 * qqq);
            var b1 = ((2.44413 * q) + (2.85619 * qq) + (1.26661 * qqq)) / b0;
            var b2 = (-((1.4281 * qq) + (1.26661 * qqq))) / b0;
            var b3 = (0.422205 * qqq) / b0; 
            var bigB = 1.0 - (b1 + b2 + b3); 
            
            // horizontal
            for (var c = 0; c < 3; c++) {
                for (var y = 0; y < height; y++) {
                    // forward 
                    var index = y * width4 + c;
                    var indexLast = y * width4 + ((width - 1) << 2) + c;
                    var pixel = data[index];
                    var ppixel = pixel;
                    var pppixel = ppixel;
                    var ppppixel = pppixel;
                    for (; index <= indexLast; index += 4) {
                        pixel = bigB * data[index] + b1 * ppixel + b2 * pppixel + b3 * ppppixel;
                        data[index] = pixel; 
                        ppppixel = pppixel;
                        pppixel = ppixel;
                        ppixel = pixel;
                    }
                    // backward
                    index = y * width4 + ((width - 1) << 2) + c;
                    indexLast = y * width4 + c;
                    pixel = data[index];
                    ppixel = pixel;
                    pppixel = ppixel;
                    ppppixel = pppixel;
                    for (; index >= indexLast; index -= 4) {
                        pixel = bigB * data[index] + b1 * ppixel + b2 * pppixel + b3 * ppppixel;
                        data[index] = pixel;
                        ppppixel = pppixel;
                        pppixel = ppixel;
                        ppixel = pixel;
                    }
                }
            }
            
            // vertical
            for (var c = 0; c < 3; c++) {
                for (var x = 0; x < width; x++) {
                    // forward 
                    var index = (x << 2) + c;
                    var indexLast = (height - 1) * width4 + (x << 2) + c;
                    var pixel = data[index];
                    var ppixel = pixel;
                    var pppixel = ppixel;
                    var ppppixel = pppixel;
                    for (; index <= indexLast; index += width4) {
                        pixel = bigB * data[index] + b1 * ppixel + b2 * pppixel + b3 * ppppixel;
                        data[index] = pixel;
                        ppppixel = pppixel;
                        pppixel = ppixel;
                        ppixel = pixel;
                    } 
                    // backward
                    index = (height - 1) * width4 + (x << 2) + c;
                    indexLast = (x << 2) + c;
                    pixel = data[index];
                    ppixel = pixel;
                    pppixel = ppixel;
                    ppppixel = pppixel;
                    for (; index >= indexLast; index -= width4) {
                        pixel = bigB * data[index] + b1 * ppixel + b2 * pppixel + b3 * ppppixel;
                        data[index] = pixel;
                        ppppixel = pppixel;
                        pppixel = ppixel;
                        ppixel = pixel;
                    }
                }
            } 
            
            return(pixels);
        }
    }


    // apply a convolution matrix
    function applyMatrix(img, pixels, matrix, amount) {

        // create a second buffer to hold matrix results
        var buffer2 = document.createElement("canvas");
        // get the canvas context 
        var c2 = buffer2.getContext('2d');

        // set the dimensions
        c2.width = buffer2.width = img.width;
        c2.height = buffer2.height = img.height;

        // draw the image to the new buffer
        c2.drawImage(img, 0, 0, img.width , img.height);
        var bufferedPixels = c2.getImageData(0, 0, c.width, c.height)

        // speed up access
        var data = pixels.data, bufferedData = bufferedPixels.data, imgWidth = img.width;

        // make sure the matrix adds up to 1
        matrix = normalizeMatrix(matrix);

        // calculate the dimensions, just in case this ever expands to 5 and beyond
        var matrixSize = Math.sqrt(matrix.length);

        // loop through every pixel
        for (var i = 1; i < imgWidth - 1; i++) {
            for (var j = 1; j < img.height - 1; j++) {

                // temporary holders for matrix results
                var sumR = sumG = sumB = 0;

                // loop through the matrix itself
                for (var h = 0; h < matrixSize; h++) {
                    for (var w = 0; w < matrixSize; w++) {

                        // get a refence to a pixel position in the matrix
                        var r = convertCoordinates(i + h - 1, j + w - 1, imgWidth) << 2;

                        // find RGB values for that pixel
                        var currentPixel = {
                            r: bufferedData[r],
                            g: bufferedData[r + 1],
                            b: bufferedData[r + 2]
                        };

                        // apply the value from the current matrix position
                        sumR += currentPixel.r * matrix[w + h * matrixSize];
                        sumG += currentPixel.g * matrix[w + h * matrixSize];
                        sumB += currentPixel.b * matrix[w + h * matrixSize];
                    }
                }

                // get a reference for the final pixel
                var ref = convertCoordinates(i, j, imgWidth) << 2;
                var thisPixel = {
                    r: data[ref],
                    g: data[ref + 1],
                    b: data[ref + 2]
                };

                // finally, apply the adjusted values
                data = setRGB(data, ref, 
                findColorDifference(amount, sumR, thisPixel.r),
                findColorDifference(amount, sumG, thisPixel.g),
                findColorDifference(amount, sumB, thisPixel.b));
            }
        }

        // code to clean the secondary buffer out of the DOM would be good here

        return(pixels);
    }

    // ensure that values in a matrix add up to 1
    function normalizeMatrix(matrix) {
        var j = 0;
        for (var i = 0; i < matrix.length; i++) {
            j += matrix[i];
        }
        for (var i = 0; i < matrix.length; i++) {
            matrix[i] /= j;
        }
        return matrix;
    }

    // convert x/y coordinates to pixel index reference
    function convertCoordinates(x, y, w) {
        return x + (y * w);
    }

    // calculate random noise. different every time!
    function noise(noiseValue) {
        return Math.floor((noiseValue >> 1) - (Math.random() * noiseValue));
    }

    // ensure an RGB value isn't negative / over 255
    function checkRGBBoundary(val) {
        if (val < 0) {
            return 0;
        } else if (val > 255) {
            return 255;
        } else {
            return val;
        }
    }

    function initializeBuffer(c, img) {
        // clean up the buffer between iterations
        c.clearRect(0, 0, img.width, img.height);
        // make sure we're drawing something
        if (img.width > 0 && img.height > 0) {

            // console.log(img.width, img.height, c.width, c.height);

            try {
                // draw the image to buffer and load its pixels into an array
                //   (remove the last two arguments on this function if you choose not to 
                //    respect width/height attributes and want the original image dimensions instead)
                c.drawImage(img, 0, 0, img.width , img.height);
                return(c.getImageData(0, 0, c.width, c.height));

            } catch(err) {
                // it's kinda strange, I'm explicitly checking for width/height above, but some attempts
                // throw an INDEX_SIZE_ERR as if I'm trying to draw a 0x0 or negative image, as per 
                // http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html#images
                //
                // AND YET, if I simply catch the exception, the filters render anyway and all is well.
                // there must be a reason for this, I just don't know what it is yet.
                //
                // console.log("exception: " + err);
            }
        }

    }


    // parse a shorthand or longhand hex string, with or without the leading '#', into something usable
    function createColor(src) {
        // strip the leading #, if it exists
        src = src.replace(/^#/, '');
        // if it's shorthand, expand the values
        if (src.length == 3) {
            src = src.replace(/(.)/g, '$1$1');
        }
        return(src);
    }

    // find a specified distance between two colours
    function findColorDifference(dif, dest, src) {
        return(dif * dest + (1 - dif) * src);
    }

    // throw three new RGB values into the pixels object at a specific spot
    function setRGB(data, index, r, g, b) {
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        return data;
    }


    // sniff whether this is an actual img element, or some other element with a background image
    function getReferenceImage(ref) {
        if (ref.nodeName == "IMG") {
            // create a reference to the image
            return ref;
        } 

        // otherwise check if a background image exists
        var bg = window.getComputedStyle(ref, null).backgroundImage;

        // if so, we're going to pull it out and create a new img element in the DOM
        if (bg) {
            var img = new Image();
            // kill quotes in background image declaration, if they exist
            // and return just the URL itself
            img.src = bg.replace(/['"]/g,'').slice(4, -1);
            return img;
        }
        return false;
    }

/*
* A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
* Digest Algorithm, as defined in RFC 1321.
* Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
* Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
* Distributed under the BSD License
* See http://pajhome.org.uk/crypt/md5 for more info.
*/
var hexcase=0;function hex_md5(a){return rstr2hex(rstr_md5(str2rstr_utf8(a)))}function hex_hmac_md5(a,b){return rstr2hex(rstr_hmac_md5(str2rstr_utf8(a),str2rstr_utf8(b)))}function md5_vm_test(){return hex_md5("abc").toLowerCase()=="900150983cd24fb0d6963f7d28e17f72"}function rstr_md5(a){return binl2rstr(binl_md5(rstr2binl(a),a.length*8))}function rstr_hmac_md5(c,f){var e=rstr2binl(c);if(e.length>16){e=binl_md5(e,c.length*8)}var a=Array(16),d=Array(16);for(var b=0;b<16;b++){a[b]=e[b]^909522486;d[b]=e[b]^1549556828}var g=binl_md5(a.concat(rstr2binl(f)),512+f.length*8);return binl2rstr(binl_md5(d.concat(g),512+128))}function rstr2hex(c){try{hexcase}catch(g){hexcase=0}var f=hexcase?"0123456789ABCDEF":"0123456789abcdef";var b="";var a;for(var d=0;d<c.length;d++){a=c.charCodeAt(d);b+=f.charAt((a>>>4)&15)+f.charAt(a&15)}return b}function str2rstr_utf8(c){var b="";var d=-1;var a,e;while(++d<c.length){a=c.charCodeAt(d);e=d+1<c.length?c.charCodeAt(d+1):0;if(55296<=a&&a<=56319&&56320<=e&&e<=57343){a=65536+((a&1023)<<10)+(e&1023);d++}if(a<=127){b+=String.fromCharCode(a)}else{if(a<=2047){b+=String.fromCharCode(192|((a>>>6)&31),128|(a&63))}else{if(a<=65535){b+=String.fromCharCode(224|((a>>>12)&15),128|((a>>>6)&63),128|(a&63))}else{if(a<=2097151){b+=String.fromCharCode(240|((a>>>18)&7),128|((a>>>12)&63),128|((a>>>6)&63),128|(a&63))}}}}}return b}function rstr2binl(b){var a=Array(b.length>>2);for(var c=0;c<a.length;c++){a[c]=0}for(var c=0;c<b.length*8;c+=8){a[c>>5]|=(b.charCodeAt(c/8)&255)<<(c%32)}return a}function binl2rstr(b){var a="";for(var c=0;c<b.length*32;c+=8){a+=String.fromCharCode((b[c>>5]>>>(c%32))&255)}return a}function binl_md5(p,k){p[k>>5]|=128<<((k)%32);p[(((k+64)>>>9)<<4)+14]=k;var o=1732584193;var n=-271733879;var m=-1732584194;var l=271733878;for(var g=0;g<p.length;g+=16){var j=o;var h=n;var f=m;var e=l;o=md5_ff(o,n,m,l,p[g+0],7,-680876936);l=md5_ff(l,o,n,m,p[g+1],12,-389564586);m=md5_ff(m,l,o,n,p[g+2],17,606105819);n=md5_ff(n,m,l,o,p[g+3],22,-1044525330);o=md5_ff(o,n,m,l,p[g+4],7,-176418897);l=md5_ff(l,o,n,m,p[g+5],12,1200080426);m=md5_ff(m,l,o,n,p[g+6],17,-1473231341);n=md5_ff(n,m,l,o,p[g+7],22,-45705983);o=md5_ff(o,n,m,l,p[g+8],7,1770035416);l=md5_ff(l,o,n,m,p[g+9],12,-1958414417);m=md5_ff(m,l,o,n,p[g+10],17,-42063);n=md5_ff(n,m,l,o,p[g+11],22,-1990404162);o=md5_ff(o,n,m,l,p[g+12],7,1804603682);l=md5_ff(l,o,n,m,p[g+13],12,-40341101);m=md5_ff(m,l,o,n,p[g+14],17,-1502002290);n=md5_ff(n,m,l,o,p[g+15],22,1236535329);o=md5_gg(o,n,m,l,p[g+1],5,-165796510);l=md5_gg(l,o,n,m,p[g+6],9,-1069501632);m=md5_gg(m,l,o,n,p[g+11],14,643717713);n=md5_gg(n,m,l,o,p[g+0],20,-373897302);o=md5_gg(o,n,m,l,p[g+5],5,-701558691);l=md5_gg(l,o,n,m,p[g+10],9,38016083);m=md5_gg(m,l,o,n,p[g+15],14,-660478335);n=md5_gg(n,m,l,o,p[g+4],20,-405537848);o=md5_gg(o,n,m,l,p[g+9],5,568446438);l=md5_gg(l,o,n,m,p[g+14],9,-1019803690);m=md5_gg(m,l,o,n,p[g+3],14,-187363961);n=md5_gg(n,m,l,o,p[g+8],20,1163531501);o=md5_gg(o,n,m,l,p[g+13],5,-1444681467);l=md5_gg(l,o,n,m,p[g+2],9,-51403784);m=md5_gg(m,l,o,n,p[g+7],14,1735328473);n=md5_gg(n,m,l,o,p[g+12],20,-1926607734);o=md5_hh(o,n,m,l,p[g+5],4,-378558);l=md5_hh(l,o,n,m,p[g+8],11,-2022574463);m=md5_hh(m,l,o,n,p[g+11],16,1839030562);n=md5_hh(n,m,l,o,p[g+14],23,-35309556);o=md5_hh(o,n,m,l,p[g+1],4,-1530992060);l=md5_hh(l,o,n,m,p[g+4],11,1272893353);m=md5_hh(m,l,o,n,p[g+7],16,-155497632);n=md5_hh(n,m,l,o,p[g+10],23,-1094730640);o=md5_hh(o,n,m,l,p[g+13],4,681279174);l=md5_hh(l,o,n,m,p[g+0],11,-358537222);m=md5_hh(m,l,o,n,p[g+3],16,-722521979);n=md5_hh(n,m,l,o,p[g+6],23,76029189);o=md5_hh(o,n,m,l,p[g+9],4,-640364487);l=md5_hh(l,o,n,m,p[g+12],11,-421815835);m=md5_hh(m,l,o,n,p[g+15],16,530742520);n=md5_hh(n,m,l,o,p[g+2],23,-995338651);o=md5_ii(o,n,m,l,p[g+0],6,-198630844);l=md5_ii(l,o,n,m,p[g+7],10,1126891415);m=md5_ii(m,l,o,n,p[g+14],15,-1416354905);n=md5_ii(n,m,l,o,p[g+5],21,-57434055);o=md5_ii(o,n,m,l,p[g+12],6,1700485571);l=md5_ii(l,o,n,m,p[g+3],10,-1894986606);m=md5_ii(m,l,o,n,p[g+10],15,-1051523);n=md5_ii(n,m,l,o,p[g+1],21,-2054922799);o=md5_ii(o,n,m,l,p[g+8],6,1873313359);l=md5_ii(l,o,n,m,p[g+15],10,-30611744);m=md5_ii(m,l,o,n,p[g+6],15,-1560198380);n=md5_ii(n,m,l,o,p[g+13],21,1309151649);o=md5_ii(o,n,m,l,p[g+4],6,-145523070);l=md5_ii(l,o,n,m,p[g+11],10,-1120210379);m=md5_ii(m,l,o,n,p[g+2],15,718787259);n=md5_ii(n,m,l,o,p[g+9],21,-343485551);o=safe_add(o,j);n=safe_add(n,h);m=safe_add(m,f);l=safe_add(l,e)}return Array(o,n,m,l)}function md5_cmn(h,e,d,c,g,f){return safe_add(bit_rol(safe_add(safe_add(e,h),safe_add(c,f)),g),d)}function md5_ff(g,f,k,j,e,i,h){return md5_cmn((f&k)|((~f)&j),g,f,e,i,h)}function md5_gg(g,f,k,j,e,i,h){return md5_cmn((f&j)|(k&(~j)),g,f,e,i,h)}function md5_hh(g,f,k,j,e,i,h){return md5_cmn(f^k^j,g,f,e,i,h)}function md5_ii(g,f,k,j,e,i,h){return md5_cmn(k^(f|(~j)),g,f,e,i,h)}function safe_add(a,d){var c=(a&65535)+(d&65535);var b=(a>>16)+(d>>16)+(c>>16);return(b<<16)|(c&65535)}function bit_rol(a,b){return(a<<b)|(a>>>(32-b))};

    
})( jQuery );