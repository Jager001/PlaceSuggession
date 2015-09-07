/**
 * Created by zhujg on 2015/4/30.
 */
define('framework/placeSuggestion/PlaceSuggestionDirectiveConstructor',
    ['angular','jquery','bmap'], function (angular,$) {

    return function ($compile, $http, $parse, $timeout,LocalStorages) {

        var suggestionTmpl =
            '<div class="suggestion-wrapper" style="display: none;">\
                <ul>\
                    <li ng-repeat="(rowIndex, row) in suggestion.source" data-row-index="{{rowIndex}}" ng-click="suggestion.rowClick(row,rowIndex)" ng-class="{\'hover\':hoverId!==undefined&&hoverId==={{rowIndex}}}">\
                        <span class="i">{{row.title}}</span><br>\
                        <span class="ii">{{row.address}}</span>\
                    </li>\
                </ul>\
            </div>';

        function Suggestion($scope, $element, $attributes) {
            var me = this;
            me.element = $element;
            me.attributes = $attributes;
            me.scope = $scope;
            me.source = me.source || [];
            me.cityName = LocalStorages.get("cityName") || "";
            if(me.cityName === "") {
                me.getCurrentCity();
            }
        }

        Suggestion.prototype.getCurrentCity = function() {
            var me=this;
            function myFun(result){
                me.cityName = result.name;
            }
            var myCity = new BMap.LocalCity();
            myCity.get(myFun);
        };

        Suggestion.prototype.search = function(keyword) {
            var me = this;
            //  清空结果
            me.source = [];
            var options = {
                onSearchComplete: function(results){
                    if (local.getStatus() === 0){
                        angular.forEach(results.Dq, function (poi) {
                            me.getAddress(poi,function(addr,dist){
                                var tempDate = {title:poi.title,
                                                address:addr,
                                                lat:poi.point.lat,
                                                lng:poi.point.lng,
                                                province:poi.province,
                                                city:poi.city,
                                                district:dist};
                                me.source.push(tempDate);
                                me.scope.$apply();
                            });
                        });
                    }
                }
            };
            // 在区域里搜索
            var local = new BMap.LocalSearch(me.cityName, options);
            if(!angular.isUndefined(keyword) && keyword!==""){
                local.search(keyword);
            }
        };

        Suggestion.prototype.getAddress = function(position, callback) {
            var me = this;
            var title    = position.title;
            var address  = position.address || "";
            var lat      = position.point.lat;
            var lng      = position.point.lng;
            var province = position.province;
            var city     = position.city;
            var addr     = "";//详细地址
            var dist     = "";//区域

            //根据地址类型来进行详细地址的拼装
            me.get_geo_info(lng, lat, function(res){
                if(angular.isDefined(res["district"])){
                    dist = res["district"];
                }
                switch(position.type) {
                    case BMAP_POI_TYPE_NORMAL : // 一般位置点
                        if (!address) {
                            addr = res["city"] + res["district"] + res["street"] + res["streetNumber"];
                        } else if (new RegExp("^(.*市)(.*[区县])$").test(address)) {
                            addr = res["city"] + res["district"] + res["street"] + res["streetNumber"];
                        } else if (new RegExp("^(.*市)(.*[区县]).+").test(address)) {
                            addr = address;
                        } else if (new RegExp(".*(?!市).*[区县]").test(address)) {
                            addr = res["city"] + address;
                        } else if (!(new RegExp("^(.*市).*[区县]").test(address))) {
                            addr = res["city"] + res["district"] + address;
                        } else {
                            addr = address;
                        }
                        break;
                    case BMAP_POI_TYPE_BUSSTOP : // 公交车站位置点
                        addr = res["city"]+res["district"]+res["street"]+res["streetNumber"];
                        break;
                    case BMAP_POI_TYPE_SUBSTOP : // 地铁车站位置点
                        addr = res["city"]+res["district"]+address+title+'地铁站';
                        break;
                }
                callback(addr,dist);
            });
        };

        Suggestion.prototype.get_geo_info = function(lng, lat, callback) {
            var myGeo = new BMap.Geocoder();
            myGeo.getLocation(new BMap.Point(lng, lat), function(res){
                callback && callback(res["addressComponents"]);
            });
        };

        Suggestion.prototype.rowClick = function(rowData, rowIndex) {
            var me = this;
            scope = me.scope;
            if(angular.isString(me.attributes.showDetailAddress) && me.attributes.showDetailAddress==='true') {
                scope.keyword = rowData.address;
            } else {
                scope.keyword = rowData.title;
            }
            scope.selectedIndex = rowIndex;
            scope.$selectedRow = rowData;
            if (angular.isString(me.attributes.selectedRow)) {
                me.scope.selectedRow = rowData;
            }
            if (angular.isFunction(scope.onRowClick)) {
                scope.onRowClick.call(rowData, rowData, rowIndex);
            }
            me.hideView();
        };

        Suggestion.prototype.hideView = function () {
            var me = this,
            scope = me.scope,
            $suggestionWrapper = scope.$suggestionWrapper;
            if ($suggestionWrapper.is(":visible")) {
                if (scope.$selectedRow === undefined) {
                    scope.$apply(function () {
                        if (angular.isString(me.attributes.selectedRow)) {
                            scope.selectedRow = undefined;
                        }
                        scope.$keyword = undefined;
                        scope.$selectedRow = undefined;
                    });
                }
                $suggestionWrapper.hide();
            }
        };

        Suggestion.prototype.showView = function () {
            var me = this,
                scope = me.scope,
                suggestionWrapper = scope.$suggestionWrapper,
                element = me.element,
                $elementPosition = element.position();
            suggestionWrapper.css({
                top: $elementPosition.top + element.outerHeight(),
                left: $elementPosition.left
            });
            if (!scope.$keyword && (!me.source || me.source.length === 0)) {
                me.search(scope.keyword);
            }
            suggestionWrapper.show();
        };

        return {
            restrict: "A",
            replace: true,
            scope:{
                onRowClick: '=',
                selectedRow: '=',
                ngModel:"="
            },
            compile: function (tElement, tAttributes) {
                tElement.attr('ng-model', 'keyword');
                tElement.attr('ng-change', 'suggestion.search(keyword)');
                tElement.removeAttr('place-suggestion');

                return function (scope, element, attributes) {

                    var timer;

                    $compile(element)(scope);
                    scope.$suggestionWrapper = $compile(suggestionTmpl)(scope);
                    element.after(scope.$suggestionWrapper);

                    var suggestion =scope.suggestion= new Suggestion(scope, element, attributes);
                    scope.keyword = scope.ngModel;

                    $(document).on('click', function (event) {
                        if (element.parent().find(event.srcElement || event.target).length === 0) {
                            suggestion.hideView();
                            suggestion.source = [];
                        } else if (timer) {
                            $timeout.cancel(timer);
                        }
                    });

                    element.on('blur', function () {
                        timer = $timeout(function () {
                            suggestion.hideView();
                        }, 200);
                    });

                    element.on('focus', function (event) {
                        suggestion.showView();
                    });

                    element.on('keydown', function (event) {
                        var e = e || event;
                        var currKey = e.keyCode || e.which || e.charCode;
                        switch (currKey) {
                            //方向上键
                            case 38:
                                if (angular.isUndefined(scope.hoverId))
                                    scope.hoverId = suggestion.source.length - 1;
                                else {
                                    scope.hoverId = scope.hoverId < 0 ? suggestion.source.length - 1 : scope.hoverId - 1;
                                }
                                scope.$apply();
                                break;
                            //方向下键
                            case 40:
                                if (angular.isUndefined(scope.hoverId))
                                    scope.hoverId = 0;
                                else {
                                    scope.hoverId = scope.hoverId >= suggestion.source.length ? 0 : scope.hoverId + 1;
                                }
                                scope.$apply();
                                break;
                            //回车键
                            case 13:
                                if (angular.isDefined(scope.hoverId)) {
                                    var rowData = suggestion.source[scope.hoverId];
                                    suggestion.rowClick(rowData, scope.hoverId);
                                    scope.$apply();
                                }
                                break;
                            default :
                                break;
                        }
                    });

                }
            }

        }
    }
});