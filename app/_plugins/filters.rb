require 'fastimage'
require 'nokogiri'


module Jekyll
  module ImageMetadataFilter

    def image_width(path)
      FastImage.size(prepare_path(path), :raise_on_failure=>true)[0]
    end

    def image_height(path)
      FastImage.size(prepare_path(path), :raise_on_failure=>true)[1]
    end

    def image_mime_type(path)
      'image/' +
        FastImage.type(prepare_path(path), :raise_on_failure=>true).to_s
    end

  private

    def prepare_path(path)
      if path.start_with?("/")  # is local path
        File.join(@context.registers[:site].config['source'], path)
      else
        path
      end
    end

  end
end

Liquid::Template.register_filter(Jekyll::ImageMetadataFilter)

#------------------------------------------------------------------------------

# Resolves nested Liquid variables in Jekyll front matter.
# From http://acegik.net/blog/ruby/jekyll/plugins/howto-nest-liquid-template-variables-inside-yaml-front-matter-block.html

module Jekyll
  module LiquifyFilter
    def liquify(input)
      Liquid::Template.parse(input).render(@context)
    end
  end
end

Liquid::Template.register_filter(Jekyll::LiquifyFilter)

#------------------------------------------------------------------------------

module Jekyll
  module ModifiedTimeFilter
    def modified_time(path)
      File.mtime(File.join(@context.registers[:site].config['source'], path))
    end
  end
end

Liquid::Template.register_filter(Jekyll::ModifiedTimeFilter)

#------------------------------------------------------------------------------

# reading_time
#
# A Liquid filter to estimate how long a passage of text will take to read
#
# https://github.com/bdesham/reading_time
#
# Copyright (c) Benjamin Esham, 2013-2015
# See README.md for full copyright information.

require 'nokogiri'

module Jekyll
  module ReadingTimeFilter

    def count_words(html)
      words(html).length
    end

    def reading_time(html)
      (count_words(html) / 270.0).ceil
    end

    private

    def text_nodes(root)
      ignored_tags = %w[ area audio canvas embed footer form img
        map math nav object script svg table track video ]

      texts = []
      root.children.each { |node|
        if node.text?
          texts << node.text
        elsif not ignored_tags.include? node.name
          texts.concat text_nodes node
        end
      }
      texts
    end

    def words(html)
      fragment = Nokogiri::HTML.fragment html
      text_nodes(fragment).map { |text| text.scan(/[\p{L}\p{M}'‘’]+/) }.flatten
    end

  end
end

Liquid::Template.register_filter(Jekyll::ReadingTimeFilter)

#------------------------------------------------------------------------------

module Jekyll
  module StripFootnotesFilter

    def strip_footnotes(raw)
      doc = Nokogiri::HTML.fragment(raw.encode('UTF-8',
                                               :invalid => :replace,
                                               :undef => :replace,
                                               :replace => ''))
      # Strip expanded footnontes.
      for block in ['div', 'a'] do
        doc.css(block).each do |ele|
          ele.remove if (ele['class'] == 'footnotes' or
                         ele['class'] == 'footnote')
        end
      end
      # Strip unexpanded footnontes ([^fn-...]).
      doc.inner_html = doc.inner_html.gsub(/\[\^fn-.+\]/, '')
    end

  end
end

Liquid::Template.register_filter(Jekyll::StripFootnotesFilter)

#------------------------------------------------------------------------------

module Jekyll
  module MiscFilters

    def keys(hash)
      hash.keys
    end

  end
end

Liquid::Template.register_filter(Jekyll::MiscFilters)
