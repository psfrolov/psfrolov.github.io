module Jekyll
  module ModifiedTimeFilter
    def modified_time(path)
      File.mtime(File.join(@context.registers[:site].config['source'], path))
    end
  end
end

Liquid::Template.register_filter(Jekyll::ModifiedTimeFilter)
