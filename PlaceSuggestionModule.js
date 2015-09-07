/**
 * Created by zhujg on 2015/4/30.
 */
define('framework/placeSuggestion/PlaceSuggestionModule', [
    'angular',
    'framework/placeSuggestion/PlaceSuggestionDirectiveConstructor',
    'framework/utils/UtilsModule',
    'css!../../../css/PlaceSuggestion.css'
], function (angular, PlaceSuggestionDirectiveConstructor,LocalStorageConstructor) {
    return angular.module('PlaceSuggestionModule', ['UtilsModule'], ['$compileProvider', function ($compileProvider) {

        $compileProvider.directive('placeSuggestion', PlaceSuggestionDirectiveConstructor,LocalStorageConstructor);
        PlaceSuggestionDirectiveConstructor.$inject = ['$compile', '$http', '$parse', '$timeout','LocalStorages'];
    }]);
})