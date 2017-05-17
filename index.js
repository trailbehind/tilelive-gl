var sm = new (require('sphericalmercator'))();
var mbgl = require('mapbox-gl-native');
var sharp = require('sharp');
var request = require('request');

module.exports = GL;

function GL(uri, callback) {
    this._map = new mbgl.Map({
        request: function(req, callback) {
            request({
                url: req.url,
                encoding: null,
                gzip: true
            }, function (err, res, body) {
                if (err) {
                    callback(err);
                } else if (res.statusCode == 200) {
                    var response = {};
    
                    if (res.headers.modified) { response.modified = new Date(res.headers.modified); }
                    if (res.headers.expires) { response.expires = new Date(res.headers.expires); }
                    if (res.headers.etag) { response.etag = res.headers.etag; }
                    
                    response.data = body;
                    
                    callback(null, response);
                } else {
                    //Dont make rendering fail if a resource is missing
                    return callback(null, {});
                }
            });
        }
    });
    this._style = require(uri.path);
    this._map.load(this._style);
    this._scale = +uri.query.scale || 1;

    return callback(null, this);
}

GL.registerProtocols = function(tilelive) {
    tilelive.protocols['gl:'] = GL;
    console.log("registering gl")
};

GL.prototype.getTile = function(z, x, y, callback) {
    var bbox = sm.bbox(+x,+y,+z, false, '900913');
    var center = sm.inverse([bbox[0] + ((bbox[2] - bbox[0]) * 0.5), bbox[1] + ((bbox[3] - bbox[1]) * 0.5)]);

    var options = {
        center: center,
        width: 512,
        height: 512,
        ratio: this._scale,
        zoom: z
    };

    this.getStatic(options, callback);
};

GL.prototype.getStatic = function(options, callback) {
    this._map.render(options, function(err, data) {
        if (err) return callback(err);

        var image = sharp(data, {
            raw: {
                width: 512,
                height: 512,
                channels: 4
            }
        })
        .png()
        .toBuffer(function(err, data, info){
            return callback(null, data, { 'Content-Type': 'image/png' });
        });
    });
};

GL.prototype.getInfo = function(callback) {
    if(callback) {
        return callback(null, {});
    } else {
        return {};
    }
};