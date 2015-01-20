(function() {
    'use strict';
    var module = angular.module('storytools.edit.style.directives', []);

    function editorDirective(name, templateUrl, property, linker) {
        module.directive(name, ['stStyleChoices', function(styleChoices) {
            return {
                restrict: 'E',
                scope: {
                    stModel: "=stModel",
                    property: "@property",
                    popover: "@popoverText"
                },
                templateUrl: 'style/widgets/' + templateUrl,
                link: function(scope, element, attrs) {
                    // @todo bleck
                    scope.$watch(function() {
                        return scope.$parent.layer;
                    }, function(neu) {
                        scope.layer = neu;
                    });
                    scope.model = scope.stModel[property || scope.property];
                    scope.styleChoices = styleChoices;
                    if (linker) {
                        linker(scope, element, attrs);
                    }
                }
            };
        }]);
    }

    module.directive('styleEditor', function() {
        return {
            restrict: 'E',
            templateUrl: 'style/style-editor.html',
            controller: 'styleEditorController',
            require: '?styleEditorController',
            scope: {
                layer : '=',
                onChange : '=',
                formChanged : '='
            }
        };
    });

    editorDirective('symbolEditor', 'symbol-editor.html', 'symbol', function(scope, el, attrs) {
        ['showGraphic', 'showRotation'].forEach(function(opt) {
            scope[opt] = attrs[opt];
        });
        scope.getSymbolizerText = function(model) {
            return model.shape || model.graphic;
        };
        scope.getSymbolizerImage = function(name) {
            return '';
        };
    });
    editorDirective('strokeEditor', 'stroke-editor.html', 'stroke');
    editorDirective('numberEditor', 'number-editor.html', null, function(scope, el, attrs) {
        var defaults = {
            max: 30
        };
        Object.keys(defaults).forEach(function(e) {
            scope[e] = attrs[e] || defaults[e];
        });
    });
    editorDirective('colorEditor', 'color-editor.html');
    editorDirective('labelEditor', 'label-editor.html', 'label', function(scope) {
        // @todo other options
        scope.styleModel = {
            bold : scope.model.fontWeight == 'bold',
            italic : scope.model.fontStyle == 'italic'
        };
        scope.styleModelChange = function() {
            scope.model.fontWeight = scope.styleModel.bold ? 'bold' : 'normal';
            scope.model.fontStyle = scope.styleModel.italic ? 'italic' : 'normal';
        };
    });

    // @todo break into pieces or make simpler
    // @todo doesn't watch iconCommons.defaults() - can become out of date
    module.directive('graphicEditor', function(stStyleChoices, ol3MarkRenderer, iconCommons, iconCommonsSearch, stSvgIcon) {
        return {
            restrict: 'E',
            templateUrl: 'style/widgets/graphic-editor.html',
            scope: {
                symbol: '='
            },

            link: function(scope, element, attrs) {
                function canvas(symbol) {
                    var el = angular.element(ol3MarkRenderer(symbol, 24));
                    el.addClass('symbol-icon');
                    el.attr('mark', symbol); // for testing until we use data URI
                    return el;
                }
                function image(icon) {
                    var el = angular.element('<img>');
                    el.attr('src', icon.dataURI);
                    el.addClass('symbol-icon');
                    el.attr('graphic', icon.uri);
                    return el;
                }
                // update the element with the data-current-symbol attribute
                // to match the current symbol
                function current() {
                    var el = angular.element(element[0].querySelector('[data-current-symbol]'));
                    el.find('*').remove();
                    if (scope.symbol.shape) {
                        el.append(canvas(scope.symbol.shape));
                    } else if (scope.symbol.graphic) {
                        stSvgIcon.getImage(scope.symbol.graphic, '#000', '#fff').then(function(icon) {
                            el.append(image(icon));
                        });
                    }
                }
                var clicked = function() {
                    var el = angular.element(this);
                    if (el.attr('shape')) {
                        scope.symbol.shape = el.attr('shape');
                        scope.symbol.graphic = null;
                    } else if (el.attr('graphic')) {
                        scope.symbol.shape = null;
                        scope.symbol.graphic = el.attr('graphic');
                    }
                    current();
                };
                // this might be done another way but because we get canvas elements
                // back from ol3 styles, we build the dom manually
                var list = angular.element(element[0].getElementsByClassName('ol-marks'));
                stStyleChoices.symbolizers.forEach(function(s) {
                    var img = canvas(s);
                    img.attr('shape', s);
                    img.on('click', clicked);
                    list.append(img);
                });
                function updateRecent() {
                    list = angular.element(element[0].getElementsByClassName('recent-icons'));
                    list.html('');
                    iconCommons.defaults().then(function(icons) {
                        icons.forEach(function(icon, i) {
                            var img = image(icon);
                            img.on('click', clicked);
                            list.append(img);
                        });
                        // we're relying on this in the tests as a means of
                        // knowing when the recent icons loading has completed
                        scope.recent = icons;
                    });
                }
                // only in scope for triggering in tests
                scope._updateRecent = function() {
                    updateRecent();
                    current();
                };
                scope._updateRecent();
                scope.showIconCommons = function() {
                    iconCommonsSearch.search().then(function(selected) {
                        // since ol3 style creation is sync, preload icon before setting
                        stSvgIcon.getImageData(selected.href).then(function() {
                            scope.symbol.shape = null;
                            scope.symbol.graphic = selected.href;
                            scope._updateRecent();
                        });
                    });
                };
            }
        };
    });

    module.directive('classifyEditor', function() {
        return {
            restrict: 'E',
            templateUrl: 'style/widgets/classify-editor.html',
            scope: true,
            link: function(scope, element, attrs) {
                ['showMethod','showMaxClasses', 'showRange',
                    'showColorRamp','showColorPalette'].forEach(function(opt) {
                    scope[opt] = attrs[opt];
                });
            }
        };
    });

    module.directive('colorRamp', function() {
        return {
            restrict: 'A',
            scope: {
                ramp: "=ramp",
            },
            link: function(scope, element, attrs) {
                var ctx = element[0].getContext('2d');
                var gradient = ctx.createLinearGradient(0, 0, attrs.width, 0);
                Object.getOwnPropertyNames(scope.ramp).forEach(function(stop) {
                    stop = parseFloat(stop);
                    if (!isNaN(stop)) {
                        gradient.addColorStop(stop, scope.ramp[stop]);
                    }
                });
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, attrs.width, attrs.height);
            }
        };
    });

    module.directive('colorField', function() {
        var regex = /(^#[0-9a-f]{6}$)|(^#[0-9a-f]{3}$)/i;
        function validColor(value) {
            // @todo support named colors?
            return regex.exec(value);
        }
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, element, attrs, ctrl) {
                ctrl.$parsers.push(function(viewValue) {
                    ctrl.$setValidity('color', validColor(viewValue));
                    return viewValue;
                });
                ctrl.$formatters.push(function(modelValue) {
                    // when loaded but also possible the picker widget modifies
                    ctrl.$setValidity('color', validColor(modelValue));
                    return modelValue;
                });
            }
        };
    });

    module.directive('noClose', function() {
        return {
            link: function($scope, $element) {
                $element.on('click', function($event) {
                    $event.stopPropagation();
                });
            }
        };
    });

    module.directive('styleTypeEditor', function($compile, $templateCache) {
        return {
            restrict: "E",
            link: function(scope, element, attrs) {
                scope.$watch('currentEditor', function() {
                    var currentEditor = scope.currentEditor;
                    var templateUrl = 'style/types/' + currentEditor.name.replace(' ', '-') + ".html";
                    element.html($templateCache.get(templateUrl));
                    $compile(element.contents())(scope);
                });
            }
        };
    });

    module.directive('rulesEditor', function() {
        return {
            restrict: 'E',
            templateUrl: 'style/rules-editor.html',
            link: function(scope, element, attrs) {
                scope.deleteRule = function(rule) {
                    scope.activeStyle.rules = scope.activeStyle.rules.filter(function(r) {
                        return r !== rule;
                    });
                };
            }
        };
    });
})();