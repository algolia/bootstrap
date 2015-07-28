/* global jQuery */

(function ($) {
  'use strict';

  var algolia = window.algoliasearch('NNYOET9BZD', 'b107a5216b65db8915163e97bdc28234')
  var suggestionTemplate = window.Hogan.compile($('#suggestion-item-template').html())
  var footerTemplate = window.Hogan.compile($('#suggestion-footer-template').html())
  var $searchInput = $('.bs-docs-nav .bs-search .form-control')
  var typeaheadOptions = {
    hint: false,
    autoselect: true // This feature is not documented in typeahead doc
  }

  // Typeahead dataset source
  function datasetSource(query, callback) {
    algolia.search([
      {
        indexName: 'bootstrap',
        query: query,
        params: {
          hitsPerPage: 5
        }
      }
    ], function (err, data) {
      if (err) {
        $.error(err)
        return
      }

      callback(reorderResults(data.results[0].hits))
    })
  }

  // Helper to get the value of an attribute, with optional highlight
  function getValue(item, key, options) {
    options = $.extend({}, { highlight: false }, options)
    if (options.highlight) {
      return item._highlightResult[key].value
    }
    return item[key]
  }

  // Return a nice readable title for each record
  // h1: 'Go to {h1}'
  // h2 through h6: '{parent_hierarchy} › {self}'
  // p: '{parent_hierarchy}'
  function getTitle(item, options) {
    var tagName = item.tag_name
    if (tagName === 'h1') {
      return 'Go to ' + getValue(item, 'text', options)
    }

    // Building the heading hierarchy
    var hierarchy = []
    $.each(['h2', 'h3', 'h4', 'h5', 'h6'], function (index, key) {
      if (!item[key]) {
        return
      }
      hierarchy.push(getValue(item, key, options))
    })

    return hierarchy.join(' › ')
  }

  // Return the snippet including ellipsis
  function getText(item) {
    if (item.tag_name !== 'p') {
      return null
    }
    var text = item._snippetResult.text.value

    // Does not start with an uppercase, so it was cut at the start
    if (text[0] !== text[0].toUpperCase()) {
      text = '…' + text
    }
    // Does not end with a period, so it was cut at the end
    if (text.slice(-1) !== '.') {
      text = text + '…'
    }
    return text
  }

  var dataset = {
    // Disable update of the input field when using keyboard
    displayKey: function () {
      return $searchInput.val()
    },
    source: datasetSource,
    templates: {
      suggestion: function (item) {
        return suggestionTemplate.render(item)
      },
      footer: function () {
        return footerTemplate.render()
      }
    }
  }

  // Group items by attribute, keeping said attribute only on the first one
  function groupBy(results, attribute) {
    var groupedResults = {}
    $.each(results, function (index, result) {
      var value = result[attribute]
      if (!groupedResults[value]) {
        result['grouped_by_' + attribute + '_header'] = true
        groupedResults[value] = [result]
        return
      }
      groupedResults[value].push(result)
    })
    return groupedResults
  }

  // Reorder results to group them by page and title
  function reorderResults(results) {
    // We filter the data we actually need from the results
    results = $.map(results, function (result) {
      return {
        page: result.title,
        h1: result.h1,
        h1_highlight: result._highlightResult.h1.value,
        title: getTitle(result, { highlight: true }),
        raw_title: getTitle(result, { highlight: false }),
        text: getText(result),
        url: result.url,
        // This one is for debug
        _original: result
      }
    })

    var groupedByPage = groupBy(results, 'page')
    var formattedResults = []
    $.each(groupedByPage, function (title, titleResults) {
      var groupedByH1 = groupBy(titleResults, 'h1')
      $.each(groupedByH1, function (h1, h1Results) {
        formattedResults = formattedResults.concat(h1Results)
      })
    })
    return formattedResults
  }

  function goToSuggestion(event, item) {
    $searchInput.typeahead('val', '')
    window.location.href = item.url
  }

  // Init typeahead
  $(function () {
    $('.bs-docs-nav.bs-no-js').removeClass('bs-no-js')
    $searchInput.typeahead(typeaheadOptions, dataset)
                .bind('typeahead:selected', goToSuggestion)

    // Toggle and focus input field when clicking on label
    // Note: We need to replicate the default HTML behavior on labels using the
    // `for` attribute as we also need to focus the input and iOS only accepts
    // focus calls when they come from a user interaction
    var $toggleCheckbox = $('#bs-toggle-search')
    var $toggleLabels = $('.bs-toggle-search-open')
    $toggleLabels.on('click', function (e) {
      $toggleCheckbox.click()
      $searchInput.focus()
      e.preventDefault()
    })

    // Fixing some default typeahead CSS not playing nicely with the navbar
    var $typeaheadWrapper = $searchInput.parent()
    var $typeaheadDropdown = $searchInput.nextAll('.tt-dropdown-menu')
    $typeaheadWrapper.css('display', 'block')
    $typeaheadDropdown.css('top', $searchInput.outerHeight() + 'px')
  })
})(jQuery)
