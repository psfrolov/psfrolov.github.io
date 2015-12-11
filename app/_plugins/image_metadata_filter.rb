require 'fastimage'

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
