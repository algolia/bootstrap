/* global jQuery */

(function ($) {
  'use strict';

  var algolia = algoliasearch('NNYOET9BZD', 'b107a5216b65db8915163e97bdc28234');
  var suggestionTemplate = Hogan.compile($('#suggestion-item-template').html());
  var typeaheadOptions = {
    hint: false
  };
  var dataset = {
    displayKey: getHeadingHierarchy,
    source: function(query, callback) {
      algolia.search([{
        indexName: 'bootstrap',
        query: query,
        params: {
          hitsPerPage: 5
        }
      }], function(err, data) {
        if (err) {
          console.log(err);
          return;
        }
        callback(formatData(data.results[0].hits));
      });
    },
    templates: {
      suggestion: render
    }
  };

  // Format results to be easier to display
  function formatData(results) {
    // We'll group results by page
    var pageLists = {};
    $.each(results, function(index, result) {
      var page = result.title;
      var list = pageLists[page];
      // Page never seen before
      if (!list) {
        pageLists[page] = [result];
        return;
      }
      delete result.title;
      pageLists[page].push(result);
    });

    var formattedResults = [];
    $.each(pageLists, function(key, value) {
      formattedResults = formattedResults.concat(value);
    });
    return formattedResults;
  }

  // Given an item, returns a string of "h2 > h3 > ..."
  function getHeadingHierarchy(item, options) {
    options = $.extend({
      highlight: false
    }, options);

    // Create the hierarchy from indexed headings
    return $.map(
      ['h2', 'h3', 'h4', 'h5', 'h6'],
      function(key) {
        if (!item[key]) {
          return undefined;
        }
        return options.highlight ? item._highlightResult[key].value : item[key];
      }).join(' > ');
  }

  function render(item) {
    return suggestionTemplate.render({
      hierarchy: getHeadingHierarchy(item, { highlight: true }),
      page: item.title,
      h1: item.h1,
      text: item._snippetResult.text.value
    });
  }

  function goToSuggestion(event, item) {
    var currentPathname = window.location.pathname;
    var suggestionPathname = item.url;
    var anchor = 'search:' + encodeURI(item.text);

    // Move accross same page
    if (currentPathname === suggestionPathname) {
      $(event.target).typeahead('val', null);
      scrollToSearchAnchor(anchor);
      return;
    }
    var url = item.url + '#' + anchor;
    var baseUrl = window.location.protocol + '//' + window.location.host;
    window.location = baseUrl + url;
  }

  function scrollToSearchAnchor(anchor) {
    // Note: We can't use the item.css_selector property from the results
    // because the docs are adding ZeroClipboard div markup to the page,
    // breaking the selector.
    // Instead we'll rely on the content
    if (!anchor.match(/^search:/)) {
      return;
    }

    var content = decodeURI(anchor.replace(/^search:/, ''))
                  .replace(/(\(|\))/g, '\\$1');
    var target = $('.bs-docs-container div[role=main]')
                 .find(':contains(' + content + ')')
                 .last();
    var targetOffset = target[0].getBoundingClientRect().top + window.pageYOffset;
    var targetHeight = target.height();
    var windowHeight = $(window).height();
    var scrollOffset = targetOffset - (windowHeight / 2) - (targetHeight / 2);

    window.scroll(0, scrollOffset);
  }

  // Init typeahead
  $(function () {
    var searchInput = $('.bs-docs-nav .navbar-search .form-control');
    searchInput.typeahead(typeaheadOptions, dataset)
      .bind('typeahead:selected', goToSuggestion);

    // Fixing some default typeahead CSS not playing nicely with the navbar
    var typeaheadWrapper = searchInput.parent();
    var typeaheadDropdown = searchInput.nextAll('.tt-dropdown-menu');
    typeaheadWrapper.css('display', 'block');
    typeaheadDropdown.css('top', searchInput.outerHeight() + 'px');
    typeaheadDropdown.css('left', '-120px');

    // Scroll to anchor on load
    scrollToSearchAnchor(window.location.hash.substring(1));
  });
})(jQuery);
