
var SVG = 'http://www.w3.org/2000/svg';
var XLINK = 'http://www.w3.org/1999/xlink';

var doc = null;
var rootElt = null;

// Find an element by ID.
function getElt(idOrElt) {
    if (idOrElt.getAttribute) {
        return idOrElt;
    }
    return doc.getElementById(idOrElt);
}

// Create an element with the given name and attributes. 
function mk(n, atts) {
    var e = document.createElementNS(SVG, n);
    if (atts) {
        for (var i in atts) {
            if (i == 'href') {
                e.setAttributeNS(XLINK, 'href', atts[i]);
            } else {
                e.setAttribute(i, atts[i]);
            }
        }
    }
    return e;
}

// Create an element and attach it to an existing one.
function subelt(p, n, atts) {
    e = mk(n, atts);
    p.appendChild(e);
    return e;
}

var logElt;
var logTspans;
var logLineHt = 16;
var logMax = 600 / 16;

function log(text) {
    if (logTspans == null) {
        logElt = subelt(getElt('bg'), 'text', {
            'font-height': logLineHt,
            x: 0,
            y: logLineHt
        });
        logTspans = [];
    }
    if (logTspans.length >= logMax) {
        var e = logTspans.shift();
        logElt.removeChild(e);
        for (var i in logTspans) {
            logTspans[i].setAttribute('y', (i - 0) * logLineHt);
        }
    }
    var newElt = subelt(logElt, 'tspan', {
        x: 0,
        y: logTspans.length * logLineHt
    });
    newElt.appendChild(doc.createTextNode(text));
    logTspans.push(newElt);
}

//
// Application specific
//

// Create the path for one bump on a jigsaw piece.
// hv -- either 'h' for a bottom or top side or 'v'
// vh -- either 'v' or 'h'
// len -- total length of the side (width or height of the piece). May be -ve.
// isIn -- whether the bump turns intwards or points outwards
function bump(hv, vh, len, isIn) {
    var bwh = 0.2 * len;
    var bhw = 0.1 * len * (!!isIn ^ (len < 0) ? -1 : 1);
    return [hv + 0.5 * (len - bwh), vh + bhw, hv + bwh, vh + -bhw, hv + 0.5 * (len - bwh)];
}

function mkPieceElts(u, imWd, imHt, nh, nv) {	
    var wd = imWd / nh;
    var ht = imHt / nv;
	var hunks = [];
	var defsElt = getElt('defs');
	var hunksElt = getElt('p');
	var dwd = hunksElt.ownerSVGElement.width.animVal.value;
	var dht = hunksElt.ownerSVGElement.height.animVal.value;
	
    var hash = function (i, j) {
        return ((i * 37) ^ (j * 1009)) % 17;
    }
	
	var pieceEltss = []; // 2-d array of hunks
	var pieceElts = []; // simple list of hunks
	for (var i = 0; i < nh; ++i) {
	    pieceEltss[i] = []
	    for (var j = 0; j < nv; ++j) {
		    var id = String.fromCharCode(97 + i) + String.fromCharCode(97 + j);
		    
		    // Create path.
		    var ds = ['M0,0'];
		    if (j == 0) {
		        ds.push('h' + wd);
	        } else {
	            ds.splice(ds.length, 0, bump('h', 'v', wd, hash(i, j) & 1));
		    }
		    if (i == nh - 1) {
		        ds.push('v' + ht);
	        } else {
	            ds.splice(ds.length, 0, bump('v', 'h', ht, hash(i + 1, j) & 2));
		    }
		    if (j == nv - 1) {
		        ds.push('h' + -wd);
	        } else {
	            ds.splice(ds.length, 0, bump('h', 'v', -wd, hash(i, j + 1) & 1));
		    }
		    if (i == 0) {
		        ds.push('v' + -ht);
	        } else {
	            ds.splice(ds.length, 0, bump('v', 'h', -ht, hash(i, j) & 2));
		    }
		    ds.push('z');
		    d = ds.join(' ');
		    
		    // Create pattern. 
		    // The image is added using a pattern (a) so that it does
		    // not expand the bbox of the piece, and (b) because
		    // images are independently draggable in Safari
		    var patternElt = subelt(defsElt, 'pattern', {
		        id: 'p' + id,
		        patternUnits: 'userSpaceOnUse',
		        patternContentUnits: 'userSpaceOnUse',
		        patternTransform: 'translate(' + (-i * wd) + ',' + (-j * ht) + ')',
		        x: 0,
		        y: 0,
		        width: imWd,
		        height: imHt		        
		    });
		    var imageElt = subelt(patternElt, 'image', {
		        href: u, 
		        x: 0,
		        y: 0,
		        width: imWd,
		        height: imHt
	        });
	        
	        // Random starting position.
		    var x = Math.random() * (dwd - wd);
		    var y = Math.random() * (dht - ht);
		    
		    if (false && (i ^ j) & 1) {
    		    // Non-random starting points to see that the hunks fit.
    		    x = i * wd * 1.2 + 50;
    		    y = j * ht * 1.2 + 40;
		    }
		    
		    // Create image with clip path.
		    var pieceElt = subelt(hunksElt, 'g', {
		        id: 'g' + id,
		        transform: 'translate(' + x + ',' + y + ')'	        
		    }) 
		    
	        var pathElt = subelt(pieceElt, 'path', {
	            d: d,
	            fill: 'url(#p' + id + ')'
	        })
	        
		    pieceEltss[i][j] = pieceElt;
		    pieceElts.push(pieceElt)
	    }
	}
	
	for (i = 0; i < nh; ++i) {
	    for (j = 0; j < nv; ++j) {
	        pieceEltss[i][j].adjs = []
	        if (i > 0) {
	            pieceEltss[i][j].adjs.push({elt: pieceEltss[i - 1][j], dx: -wd});
            }
            if (i + 1 < nh) {
	            pieceEltss[i][j].adjs.push({elt: pieceEltss[i + 1][j], dx: wd});
            }
            if (j > 0) {
	            pieceEltss[i][j].adjs.push({elt: pieceEltss[i][j - 1], dy: -ht});
            }
            if (j + 1 < nv) {
	            pieceEltss[i][j].adjs.push({elt: pieceEltss[i][j + 1], dy: ht});
            }
	    }
	}
	
	return pieceElts;
}

function getPt(elt) {
    var m = elt.getCTM();
    return {x: m.e, y: m.f};
}

function mkJigsaw(bgElt, pieceElts) {
    bgElt = getElt(bgElt);
    
    var hunks = [];
    for (var i in pieceElts) {
        hunks.push(pieceElts[i].hunk = {i: i, elts: [pieceElts[i]]});
    }
    
    var isDrag = false;
    var dragHunk = null;
    var dragStartX = null;
    var dragStartY = null;
    var startX = null;
    var startY = null;

    bgElt.addEventListener('mousemove', function (evt) {
        if (isDrag) {
            var shiftX = evt.clientX - dragStartX;
            var shiftY = evt.clientY - dragStartY;
            
            for (var j in dragHunk.elts) {
                var e = dragHunk.elts[j];
                var t = 'translate(' + (e.startX + shiftX) + ',' + (e.startY + shiftY) + ')';
                e.setAttribute('transform', t);
            }
        }
    }, false);
    bgElt.addEventListener('mouseup', function (evt) {
        if (isDrag) {
            // Is thus chunk close enough to other chunks to snap together?
            for (var i = 0; i < dragHunk.elts.length; ++i) {
                var dragElt = dragHunk.elts[i];
                var dragPt = getPt(dragElt);
                
                // Check each adjacent piece to this one.
                for (var j in dragElt.adjs) {
                    var adj = dragElt.adjs[j];
                    if (adj.elt.hunk != dragHunk) { // Must be in a different hunk.
                        var adjPt = getPt(adj.elt);
                        if (adj.dx) {
                            adjPt.x -= adj.dx;
                        }
                        if (adj.dy) {
                            adjPt.y -= adj.dy;
                        }
                        var dSquared = Math.pow(dragPt.x - adjPt.x, 2) + Math.pow(dragPt.y - adjPt.y, 2);
                        if (dSquared < 25) { // Must be close to the dragged piece.
                            log('snap');
                            
                            // Adjust the position of the dragged piece to close the gap.
                            var dx = adjPt.x - dragPt.x;
                            var dy = adjPt.y - dragPt.y;
                            for (var k in dragHunk.elts) {
                                var ee = dragHunk.elts[k];
                                var pt = getPt(ee);
                                var t = 'translate(' + (pt.x + dx) + ',' + (pt.y + dy) + ')';
                                ee.setAttribute('transform', t);
                            }
                            dragPt = getPt(dragElt);
                            
                            // Attach the elements of the absorbed chunk to this one.
                            var absorbedElts = adj.elt.hunk.elts;
                            dragHunk.elts = dragHunk.elts.concat(absorbedElts);
                            for (var k in absorbedElts) {
                                absorbedElts[k].hunk = dragHunk;
                            }
                        }
                    }
                }
            }
            log('Hunk size: ' + dragHunk.elts.length);
            
            dragHunk = null;
            isDrag = false;
        }
    }, false);

    for (var k in hunks) {
        var hunk = hunks[k];
        for (var eltID in hunk.elts) {
            var pieceElt = hunk.elts[eltID];
            pieceElt.addEventListener('mousedown', function (evt) {
                dragHunk = evt.currentTarget.hunk;
                isDrag = true;

                dragStartX = evt.clientX;
                dragStartY = evt.clientY;
                for (var j in dragHunk.elts) {
                    var e = dragHunk.elts[j];
                    var m = e.getCTM();
                    e.startX = m.e;
                    e.startY = m.f;
                }
            }, false);
        }
    }
}

// Called from main SVG element when document loaded.
function init(evt) {
	doc = evt.target.ownerDocument;
	rootElt = doc.documentElement;
	
	u = 'http://farm5.static.flickr.com/4077/4871527376_35120786b3_z.jpg';
	var pieceElts = mkPieceElts(u, 640, 512, 8, 7);
	mkJigsaw('p', pieceElts);
};