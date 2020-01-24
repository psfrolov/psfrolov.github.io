require 'fastimage'
require 'nokogiri'


module Jekyll
  module ImageMetadataFilter

    def image_width(path)
      FastImage.size(resolve_path(path), :raise_on_failure=>true)[0]
    end

    def image_height(path)
      FastImage.size(resolve_path(path), :raise_on_failure=>true)[1]
    end

    def image_aspect_ratio(path)
      path = resolve_path(path)
      if File.extname(path) == '.svg'
        img = File.open(path) { |f| Nokogiri::XML(f) }
        viewbox = img.at_xpath('/xmlns:svg/@viewBox')
        raise 'Failed to find viewbox attribute.' if !viewbox
        viewbox_attrs = viewbox.value.split(' ').map(&:to_f)
        viewbox_attrs[2] / viewbox_attrs[3]
      else  # raster images
        size = FastImage.size(path, :raise_on_failure=>true)
        size[0].to_f / size[1]
      end
    end

    def image_mime_type(path)
      'image/' +
        FastImage.type(resolve_path(path), :raise_on_failure=>true).to_s
    end

  private

    def resolve_path(path)
      if path.start_with?("/")  # is local path
        for location in ['source', 'destination']
          resolved_path = File.join(@context.registers[:site].config[location],
                                    path)
          return resolved_path if File.file?(resolved_path)
        end
        raise "Failed to find file #{path}."
      end
      return path
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
