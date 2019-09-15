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

    def image_aspect_ratio(path)
      size = FastImage.size(prepare_path(path), :raise_on_failure=>true)
      size[0].to_f / size[1]
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
