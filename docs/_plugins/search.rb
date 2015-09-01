# Overwrite Algolia Jekyll plugin with custom hooks
class AlgoliaSearchRecordExtractor
  def custom_hook_each(item, node)
    BootstrapCustomSearchHelper.hook_each(item, node)
  end
end

# Extracting custom indexing methods in its own class
class BootstrapCustomSearchHelper
  def self.hook_each(item, node)
    # Excluding element we don't want to index
    return nil if excluded_page?(item)
    return nil if example?(node)

    # Set the h1 as the page title
    item[:h1] = item[:title]
    # Convert the first <p> of each pages as <h1>
    if item[:tag_name] == 'p' && item[:css_selector_parent].nil?
      item[:tag_name] = 'h1'
      item[:text] = item[:h1]
    end

    # We extract the <code> of the text
    item[:code] = code(node)
    if item[:tag_name] == 'p'
      return nil if item[:code].size == 0
      item[:text] = nil
    end

    # Prepare display fields
    item[:category] = category(item)
    item[:url] = url(item)
    item[:title] = title(item)

    # Prepare custom ranking fields
    item[:weight] = weight_tag_name(item)
    item[:order_in_page] = order_in_page(item)

    clear_unused_keys(item)

    item
  end

  # Blacklist some pages that we do not want to index
  def self.excluded_page?(item)
    return true unless item[:group]
    false
  end

  # Check if specified node is an example
  def self.example?(node)
    return false if node.name == 'body'

    parent = node.parent
    parent_classes = parent.attr('class')
    return true if parent_classes && parent_classes.include?('bd-example')

    example?(parent)
  end

  # 'getting-started' => 'Getting Started'
  def self.category(item)
    return nil if item[:group].nil?
    item[:group].split('-').map(&:capitalize).join(' ')
  end

  # get the first and last level of the hierarchy as title
  def self.title(item)
    hierarchy = item[:unique_hierarchy].split(' > ')
    title = hierarchy.first
    title = "#{title} › #{hierarchy.last}" if hierarchy.last != hierarchy.first
    title
  end

  # get the full url with anchor
  def self.url(item)
    anchor = nil
    anchor = item[:css_selector_parent] if item[:css_selector_parent] =~ /^#/
    anchor = item[:css_selector] if item[:css_selector] =~ /^#/
    "#{item[:url]}#{anchor}"
  end

  # Set weight based on tag name (h1: 90, h6: 40, p: 0)
  def self.weight_tag_name(item)
    tag_name = item[:tag_name]
    return 0 if tag_name == 'p'
    100 - tag_name.gsub('h', '').to_i * 10
  end

  # Order of the node in the page source
  def self.order_in_page(item)
    item[:objectID].to_s.split('_').last.to_i
  end

  # Extract <code> from a text
  def self.code(node)
    codes = node.css('code').map do |code|
      content = code.content
      next if content =~ / /

      # Split in words
      content.gsub!(%r{[=\-_/]}, ' ')
      # Keep only alphanumeric chars
      content.gsub!(/[^a-zA-Z0-9 ]/, '')
      # Remove dangling numbers
      content.gsub!(/[0-9] /, '')
      content.gsub!(/ [0-9]/, '')

      content.strip!

      next if content == ''

      content
    end
    codes.reject(&:nil?)
  end

  # Lighten the object to be pushed
  def self.clear_unused_keys(item)
    item.delete(:css_selector)
    item.delete(:css_selector_parent)
    item.delete(:group)
    item.delete(:layout)
    item.delete(:raw_html)
    item.delete(:slug)
    item.delete(:tag_name)
    item.delete(:type)
    item.delete(:unique_hierarchy)
  end

end
