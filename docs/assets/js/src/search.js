/* global jQuery */

(function ($) {
  'use strict';

  var appId = 'NNYOET9BZD'
  var indexName = 'bootstrap_v4'
  var apiKey = 'b107a5216b65db8915163e97bdc28234'
  var $searchInput = $('#search-input')

  function suggestionTemplate(hit) {
    var output = '<div class="tt-suggestion-title">' + hit._highlightResult.title.value + '</div>'
    if (hit.has_category_header) {
      output = '<div class="tt-suggestion-category">' + hit._highlightResult.category.value + '</div>' + output
    }
    return output
  }

  // Reorder results to group them by category
  function reorderResults(results) {
    // We group results on the same page together
    var groupedResults = {}
    $.each(results.hits, function (index, result) {
      if (!groupedResults[result.category]) {
        result.has_category_header = true
        groupedResults[result.category] = []
      }
      groupedResults[result.category].push(result)
    })

    var sortedResults = []
    $.each(groupedResults, function (category, categoryResults) {
      sortedResults = sortedResults.concat(categoryResults)
    })

    return sortedResults;
  }

  // Typeahead dataset source
  function datasetSource(query, callback) {
    // lightweight Algolia query
    var params = {
      query: query,
      'x-algolia-api-key': apiKey,
      'x-algolia-application-id': appId,
      hitsPerPage: 5
    }

    // several hostnames for fault-tolerance
    var hosts = [
      'dsn.algolia.net',
      '1.algolianet.com',
      '2.algolianet.com',
      '3.algolianet.com'
    ]

    function retryQuery(retry) {
      if (retry >= hosts.length) {
        callback([])
        return
      }
      var url = 'https://' + appId + '-' + hosts[retry] + '/1/indexes/' + indexName;
      $.ajax({
        url: url,
        data: params,
        timeout: (2000 * (retry + 1))
      }).then(function (content) {
        callback(reorderResults(content));
      }, function () {
        retryQuery(retry + 1);
      });
    }

    retryQuery(0);
  }

  function goToSuggestion(event, item) {
    $searchInput.typeahead('val', '')
    window.location.href = item.url
  }

  $searchInput.typeahead({
    hint: false,
    autoselect: true
  }, {
    displayKey: function () { return $searchInput.val() },
    source: datasetSource,
    templates: {
      suggestion: suggestionTemplate
    }
  }).bind('typeahead:selected', goToSuggestion)
})(jQuery)
