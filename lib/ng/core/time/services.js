(function() {
    'use strict';

    var module = angular.module('storytools.core.time.services', []);

    module.service('stTimeControlsFactory', function($rootScope) {
        function getTimes(map) {
            // @todo! - need to get all times, not just one
            var times = null;
            map.getLayers().forEach(function(l) {
                if (l._times) {
                    times = l._times;
                }
            });
            return times;
        }
        return {
            create: function(options) {
                if (! options.map) {
                    throw 'timeControls requires map';
                }
                var annotations = options.annotations || [];
                var data = options.data || getTimes(options.map);
                if (!data) {
                    throw new Error('no data provided or found');
                }
                return storytools.core.time.create({
                    annotations: annotations,
                    map: options.map,
                    data: data,
                    playback: options.playbackOptions,
                    tileStatusCallback: function(remaining) {
                        $rootScope.$broadcast('tilesLoaded', remaining);
                    }
                });
            }
        };
    });
})();