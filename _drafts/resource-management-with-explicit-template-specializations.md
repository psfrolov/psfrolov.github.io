---
title: Resource Management with Explicit Template Specializations
tags: cpp generic-programming windows-api
---

> This is my article from the [April 2015 issue of Overload journal] in a
web-friendly format.

[RAII][url-raii] is one of the most important and useful C++ idioms. RAII
efficiently relieves the programmer of manual resource management and is a must
for writing [exception-safe][url-exception-safety] code. Perhaps, the most
ubiquitous usage of RAII is dynamic memory management with
[smart pointers][url-smart-pointer], but there are a plenty of other resources
for which it can be applied, notably in the world of low-level libraries.
Examples are Windows API handles, POSIX file descriptors, OpenGL primitives,
and so on.

### Applying RAII: Available Options

There are several choices we could make when deciding to implement an RAII
wrapper for the resource of some kind:

- write a specific wrapper for that particular resource type;
- use a standard library smart pointer with custom deleter (e.g.,
  `std::unique_ptr<Handle, HandleDeleter>`);
- implement a generic one ourselves.

The first option, writing a specific wrapper, may seem reasonable at the
beginning, and in fact, is a good starting point. The simplest RAII wrapper
may look something like this:
{% highlight c++ %}
class ScopedResource {
public:
  ScopedResource() = default;
  explicit ScopedResource(Resource resource) : resource_{ resource } {}
  ScopedResource(const ScopedResource&) = delete;
  ScopedResource& operator=(const ScopedResource&) = delete;
  ~ScopedResource() { DestroyResource(resource_); }
  operator const Resource&() const { return resource_; }

private:
  Resource resource_{};
};
{% endhighlight %}

However, as your code base grows in size, so does the number of resources.
Eventually you’ll notice that most of resource wrappers are quite similar,
usually the only difference between them is the clean-up routine. This
causes error-prone copy/paste-style code reuse. On the other hand, this is
a great opportunity for _generalization_, which leads us to the second option:
smart pointers.

The smart pointer class template is a generic solution to resource
management. Even so, it has its own drawbacks, which we will discuss
shortly. As their name suggests, smart pointers were designed mainly for
memory management and their usage with other kinds of resources is often
at least inconvenient. Let’s look at the smart pointer option in more detail.

### Why Smart Pointers Are Not Smart Enough

Consider the following code:
{% highlight c++ %}
#include <memory>

// From low-level API.
using Handle = void*;
Handle CreateHandle() { Handle h{ nullptr }; /*...*/ return h; } 
void CloseHandle(Handle h) { /* ... */ }

struct HandleDeleter { void operator()(Handle h) { CloseHandle(h); } };
using ScopedHandle = std::unique_ptr<Handle, HandleDeleter>;

int main() {
  ScopedHandle h{ CreateHandle() };  // error: expected argument of type void**
}
{% endhighlight %}

Why is the `ScopedHandle` constructor expecting an argument of type `void**`?
Recall, that smart pointer were designed primarily for pointer types:
`std::unique_ptr<int>` actually manages `int*`. Similarly
`std::unique_ptr<Handle>` manages `Handle*` which is an alias for `void**` in
our example. How can we work around this? First, we could use the
`std::remove_pointer` metafunction:
{% highlight c++ %}
using ScopedHandle =
  std::unique_ptr<std::remove_pointer_t<Handle>, HandleDeleter>;
{% endhighlight %}

Second, we could use an obscure feature of the smart pointer deleter: if
there exists a nested type named `pointer`, then this type is used by
`unique_ptr` as a managed pointer type:
{% highlight c++ %}
struct HandleDeleter {
  using pointer = Handle;
  void operator()(Handle h) { CloseHandle(h); }
};
using ScopedHandle = std::unique_ptr<Handle, HandleDeleter>;
{% endhighlight %}

As you can see, neither of these solutions is as user-friendly as we want them
to be, though the main problem is another. Smart pointer forces you to make
assumptions about `Handle` type. But handle is meant to be an opaque
descriptor, the actual definition of handle is an implementation detail of
which the user is not required to be aware.

There is another, more serious problem with smart pointer approach:
{% highlight c++ %}
#include <memory>

using Handle = int;
Handle CreateHandle() { Handle h{ -1 }; /*...*/ return h; }
void CloseHandle(Handle h) { /* ... */ }

struct HandleDeleter {
  using pointer = Handle;
  void operator()(Handle h) { CloseHandle(h); }
};
using ScopedHandle = std::unique_ptr<Handle, HandleDeleter>;

int main() {
  // Error: type mismatch: "int" and "std::nullptr_t".
  ScopedHandle h{ CreateHandle() };
}
{% endhighlight %}

In practice, the code above may work without problems with some of
`std::unique_ptr` implementations, but in general this is not guaranteed and
definitely is not portable.

The reason for an error in this case is a violation of
[NullablePointer][url-nullable-pointer] _concept_ by the managed type. In a
nutshell, the _model_ of `NullablePointer` concept must be pointer-like type,
comparable to `nullptr`. Our `Handle`, defined as an alias to `int`, is no such
thing. As a consequence, we can't use `unique_ptr` for something like POSIX
file descriptors or OpenGL `GLuint` handles.

There is workaround, though. We can define an adaptor for `Handle` which
fulfils the requirements of `NullablePointer`, but writing _a wrapper for a
wrapper_ is too much craziness for my taste. :-)

Yet another smart pointer issue is related to convenience of use. Consider
idiomatic usage of a hypothetical `Bitmap` resource:
{% highlight c++ %}
// Graphics API.
bool CreateBitmap(Bitmap* bmp) { /*...*/ return true; }
bool DestroyBitmap(Bitmap bmp) { /* ... */ return true; }
bool DrawBitmap(DeviceContext ctx, Bitmap bmp) { /* ... */ return true; }

...

// User code.
DeviceContext ctx{};
Bitmap bmp{};
CreateBitmap(&bmp);
DrawBitmap(ctx, bmp);
{% endhighlight %}

Now compare this with the usage of `std::unique_ptr` for managing `Bitmap`:
{% highlight c++ %}
struct BitmapDeleter {
  using pointer = Bitmap;
  void operator()(Bitmap bmp) { DestroyBitmap(bmp); }
};
using ScopedBitmap = std::unique_ptr<Bitmap, BitmapDeleter>;

...

DeviceContext ctx{};
Bitmap tmp;
CreateBitmap(&tmp);
ScopedBitmap bmp{ tmp };
DrawBitmap(ctx, bmp.get());
{% endhighlight %}

As you can see, the `ScopedBitmap` is more awkward to use. In particular, it
can't be passed directly to functions designed for `Bitmap`.

Considering the above, let's move to the third option: implementing an RAII
wrapper ourselves.

### Implementation

The implementation presented below is using a different approach to clean-up
routine than standard library smart pointers. It takes advantage of an ability
to [selectively specialize non-template members of class template]
[url-previous-post].
{% highlight c++ %}
#include <cassert>
#include <memory>  // std::addressof

template<typename ResourceTag, typename ResourceType> class Resource {
public:
  Resource() noexcept = default;
  explicit Resource(ResourceType resource) noexcept : resource_{ resource } {}
 
  Resource(const Resource&) = delete;
  Resource& operator=(const Resource&) = delete;
 
  Resource(Resource&& other) noexcept :
    resource_{ other.resource_ } { other.resource_ = {}; }
    
  Resource& operator=(Resource&& other) noexcept {
    assert(this != std::addressof(other));
    Cleanup();
    resource_ = other.resource_;
    other.resource_ = {};
    return *this;
  }
 
  ~Resource() { Cleanup(); }
 
  operator const ResourceType&() const noexcept { return resource_; }
  
  ResourceType* operator&() noexcept {
    Cleanup();
    return &resource_;
  }

private:
  // Intentionally undefined - must be explicitly specialized.
  void Cleanup() noexcept;

  ResourceType resource_{};
};
{% endhighlight %}

First, some minor design points.

- The class is _noncopyable_, but _movable_, thus, it provides _sole ownership
  semantic_ (just like `std::unique_ptr`). One can provide
  _shared ownership_ counterpart (akin to `std::shared_ptr`) if needed.
- Taking into account that most `ResourceType` arguments are simple resource
  handles (like `void*` or `int`), the class methods are defined `noexcept`.
- Overloading `operator&` is a questionable (if not bad) design decision.
  Nevertheless, I decided to do it in order to facilitate the usage of the
  class with factory functions of the form `void CreateHandle(Handle* handle)`.
  
Now to the core. As you can see, the `Cleanup` method which is the
cornerstone of our RAII wrapper is left undefined. As a result, an attempt to
instantiate such a class will lead to an error. The trick is to define an
[explicit specialization][url-explicit-specialization] of `Cleanup` for
particular resource type. For example:
{% highlight c++ %}
// Here "FileId" is some OS-specific file descriptor type which must
// be closed with CloseFile function.
using File = Resource<struct FileIdTag, FileId>;
template<> void File::Cleanup() noexcept {
  if (resource_)
    CloseFile(resource_);
}
{% endhighlight %}

Now we can use our class to wrap `FileId` objects:
{% highlight c++ %}
{
  File file{ CreateFile(file_path) };
  ...
}  // "file" will be destroyed here
{% endhighlight %}

You can think of `Cleanup` declaration inside `Resource` as a "compile-time
pure virtual function". Similarly, explicit specialization of `Cleanup` for
`FileId` is a concrete implementation of such a function.

### What's the Deal with ResourceTag? 

You may wonder, why do we need `ResourceTag` template parameter which is used
nowhere? It solves two purposes.

First is _type-safety_. Imagine two different resource types, say `Bitmap` and
`Texture`, both of which are defined as type aliases for `void*`. Without
the tag parameter, the compiler simply couldn't detect the nasty bug in the
following code:
{% highlight c++ %}
using ScopedBitmap = Resource<Bitmap>;
using ScopedTexture = Resource<Texture>;

void DrawBitmap(DeviceContext& ctx, ScopedBitmap& bmp){ /* ... */ }

int main() {
  DeviceContext ctx;
  ScopedBitmap bmp;
  ScopedTexture t;
  // Passing texture to function expecting bitmap. Compiles OK.
  DrawBitmap(ctx, t);
}
{% endhighlight %}

With the help of the tag however, compiler can do it:
{% highlight c++ %}
using ScopedBitmap = Resource<struct BitmapTag, Bitmap>;
using ScopedTexture = Resource<struct TextureTag, Texture>;

int main() {
  DeviceContext ctx;
  ScopedBitmap bmp;
  ScopedTexture t;
  DrawBitmap(ctx, t);  // error: type mismatch
}
{% endhighlight %}

The second purpose of the tag: it allows us to define `Cleanup` specializations
for conceptually different resources having the same C++ type. Once again,
imagine that our `Bitmap` resource requires a `DestroyBitmap` function while
`Texture` requires `DestroyTexture`. Without tag parameters `ScopedBitmap` and
`ScopedTexture` would be the same type (recall that both `Bitmap` and `Texture`
are `void*` in our example), preventing us from defining specialized clean-up
routines for each of them.

Speaking about the tag, the following expression may seem odd-looking to some:
{% highlight c++ %}
using File = Resource<struct FileIdTag, FileId>;
{% endhighlight %}

In particular, I'm talking about the usage of `struct FileIdTag` as a template
argument. Let's see the equivalent expression, the meaning of which I bet is
clear to those familiar with [tag dispatching][url-tag-dispatching]:
{% highlight c++ %}
struct FileIdTag{};
using File = Resource<FileIdTag, FileId>;
{% endhighlight %}

Conventional tag dispatching makes use of function overloading with argument of
tag type being overload selector. The tag is passed to the overloaded function
by value, hence, tag type must be a _complete type_. In our case however, no
function overloading is taking place. The tag is used only as a template
argument to facilitate explicit specialization. Taking into account that C++
permits _incomplete types_ as template arguments, we can replace tag type
definition with a declaration:
{% highlight c++ %}
struct FileIdTag;
using File = Resource<FileIdTag, FileId>;
{% endhighlight %}

Now, considering that `FileIdTag` is needed only inside type alias declaration,
we can move it directly into the place of usage:
{% highlight c++ %}
using File = Resource<struct FileIdTag, FileId>;
{% endhighlight %}

### Making an Explicit Specialization Requirement a Little More Explicit

If the user fails to provide an explicit specialization for `Cleanup` method,
he/she will not be able to build the program. This is by design. However, there
are two usability issues involved:

- the error is reported at link-time, while it is preferable (and possible) to
  detect it much earlier, at compile-time;
- the error message gives the user no clue about the actual problem and the way
  to solve it.
 
Let's try to fix it with the help of `static_assert`:
{% highlight c++ %}
void Cleanup() noexcept {
  static_assert(false, "This function must be explicitly specialized.");
}
{% endhighlight %}

Unfortunately, it won't work as expected: the assertion may produce an error
even though the _primary_ `Cleanup` method is never _instantiated_. The reason
is the following: the condition inside `static_assert` does not depend in any
way on our class template parameters, therefore, the compiler can evaluate the
condition even before attempting to instantiate the template.

Knowing that, the fix is simple: make the condition dependent on template
parameter(s) of the class template. We could do this by writing a
_compile-time_ member function which unconditionally produces a constant of the
value `false`:
{% highlight c++ %}
static constexpr bool False() noexcept { return false; }

void Cleanup() noexcept {
  static_assert(False(), "This function must be explicitly specialized.");
}
{% endhighlight %}

### Thin Wrappers vs. Full-Fledged Abstractions

The RAII-wrapper template presented provides a thin abstraction dealing
strictly with resource management. One may argue, why bother using such a
wrapper instead of implementing a proper high-level abstraction in the first
place? As an example, consider writing a bitmap class from scratch:
{% highlight c++ %}
class Bitmap {
public:
  Bitmap(int width, int height);
  ~Bitmap();
  
  int Width() const;
  int Height() const;
  
  Colour PixelColour(int x, int y) const;
  void PixelColour(int x, int y, Colour colour);
  
  DC DeviceContext() const;
  
  /* Other methods... */

private:
  int width_{};
  int height_{};

  // Raw resources.
  BITMAP bitmap_{};
  DC device_context_{};
};
{% endhighlight %}

To see why such a design is a bad idea in general, let’s write a constructor
for the `Bitmap` class:
{% highlight c++ %}
Bitmap::Bitmap(int width, int height) : width_{ width }, height_{ height } {
  // Create bitmap.
  bitmap_ = CreateBitmap(width, height);
  if (!bitmap_)
    throw std::runtime_error{ "Failed to create bitmap." };

  // Create device context.
  device_context_ = CreateCompatibleDc();
  if (!device_context_)
    // bitmap_ will be leaked here!
    throw std::runtime_error{ "Failed to create bitmap DC." };

  // Select bitmap into device context.
  // ...
}
{% endhighlight %}

As you can see our class is actually managing two resources: the bitmap
itself and the corresponding device context (this example is inspired by the
[Windows GDI][url-windows-gdi], where a bitmap must be backed up by an
in-memory device context for most of the drawing operations and for the sake of
interoperability with modern graphics APIs). And here goes the problem:
if the `device_context_` initialization fails, the `bitmap_` will be leaked!

On the other hand, consider the equivalent code with the usage of scoped
resources:
{% highlight c++ %}
using ScopedBitmap = Resource<struct BitmapTag BITMAP>;
using ScopedDc = Resource<struct DcTag, DC>;
...
Bitmap::Bitmap(int width, int height) : width_{ width }, height_{ height } {
  // Create bitmap.
  bitmap_ = ScopedBitmap{ CreateBitmap(width, height) };
  if (!bitmap_)
    throw std::runtime_error{ "Failed to create bitmap." };
  
  // Create device context.
  device_context_ = ScopedDc{ CreateCompatibleDc() };
  if (!device_context_)
    // Safe: bitmap_ will be destroyed in case of exception.
    throw std::runtime_error{ "Failed to create bitmap DC." };

  // Select bitmap into device context.
  // ...
}
{% endhighlight %}

This example leads us to the following guideline: _do not keep more than one
unmanaged resource as a class member_. Better consider applying RAII to each of
the resources, and then use them as building blocks for a more high-level
abstractions. This approach both ensures exception safety and code reuse (you
can recombine those building block as you wish in the future without the fear
of introducing resource leaks).

### More Examples

Below are some real-world examples of useful specializations for Windows API
objects. Windows API is chosen, because it provides many opportunities for RAII
application. The examples are self-explanatory enough; no Windows API knowledge
is required.
{% highlight c++ %}
// Windows handle.
using Handle = Resource<struct HandleTag, HANDLE>;
template<> void Handle::Cleanup() noexcept {
  if (resource_ && resource_ != INVALID_HANDLE_VALUE)
    CloseHandle(resource_);
}

// WinInet handle.
using WinInetHandle = Resource<struct WinInetHandleTag, HINTERNET>;
template<> void WinInetHandle::Cleanup() noexcept {
  if (resource_)
    InternetCloseHandle(resource_);
}

// WinHttp handle.
using WinHttpHandle = Resource<struct WinHttpHandleTag, HINTERNET>;
template<> void WinHttpHandle::Cleanup() noexcept {
  if (resource_)
    WinHttpCloseHandle(resource_);
}

// Pointer to SID.
using Psid = Resource<struct PsidTag, PSID>;
template<> void Psid::Cleanup() noexcept {
  if (resource_)
    FreeSid(resource_);
}

// Network Management API string buffer.
using NetApiString = Resource<struct NetApiStringTag, wchar_t*>;
template<> void NetApiString::Cleanup() noexcept {
  if (resource_ && NetApiBufferFree(resource_) != NERR_Success) {
    // Log diagnostic message in case of error.
  }
}

// Certificate store handle.
using CertStore = Resource<struct CertStoreTag, HCERTSTORE>;
template<> void CertStore::Cleanup() noexcept {
  if (resource_)
    CertCloseStore(resource_, CERT_CLOSE_STORE_FORCE_FLAG);
}
{% endhighlight %}

<div class="message">
<i class="fa fa-exclamation-triangle" title="Warning"></i>
A couple of gotchas to watch for when defining explicit template
specializations:
<ul>
  <li>explicit specialization must be defined in the same
      <code>namespace</code> as the primary template (in our case, the
      <code>Resource</code> class template);
  </li>
  <li>an explicit specialization function definition residing in a header file
      must be <code>inline</code>: remember, the explicit specialization is a
      regular unction, not a template anymore.
  </li>
</ul>
</div>

### Comparing with unique_resource from N3949

The limitations of smart pointers as a generic resource management tool
discussed earlier have led to development of standard proposal
[N3949][url-n3949]. N3949 suggests a `unique_resource_t` class template similar
to the one presented in the article but with a more conventional approach
to the clean-up routine (i.e., in the vein of `std::unique_ptr`):
{% highlight c++ %}
template<typename Resource, typename Deleter> class unique_resource_t {
  /* … */
};

// Factory.
template<typename Resource, typename Deleter>
unique_resource_t<Resource, Deleter>
unique_resource(Resource&& r, Deleter d) noexcept {
  /* … */
}

...

// Usage (predefined deleter).
struct ResourceDeleter {
  void operator()(Resource resource) const noexcept {
    if (resource)
      DestroyResource(resource);
  }
};
using ScopedResource = unique_resource_t<Resource, ResourceDeleter>;
ScopedResource r{ CreateResource(), ResourceDeleter{} };

// Alternative usage (in-place deleter definition).
auto r2 = unique_resource(CreateResource(),
                          [](Resource r){ if (r) DestroyResource(r); });
{% endhighlight %}

As you can see, `unique_resource_t` uses a clean-up routine _per resource
instance_, while the `Resource` class utilizes a clean-up routine _per resource
type_ approach. Conceptually, a clean-up routine is more a property of a
resource type rather than instance (this is obvious from most of the real-world
usage of RAII wrappers). Consequently, it becomes tedious to specify clean-up
routine during each and every resource creation. On rare occasions, however,
such a flexibility can be desired. As an example, consider the clean-up
function which takes a policy flag to control the deletion of resource, such as
the `CertCloseStore` Windows API function presented earlier in the examples
section.

Speaking about the amount of code needed to define a resource wrapper, there is
not much difference between `Resource` and `unique_resource_t`. Personally, I
find function specialization definition to be more elegant than _functor_
definition (i.e., `struct` with `operator()`). For `unique_resource_t` we could
also use in-place lambda instead, as shown above, but this quickly becomes
inconvenient as we need to create resources in more than one place in the code
(the lambda definition must be repeated then). On the other hand, passing
_callable_ objects in constructors to provide custom logic is widely used in
C++, while defining explicit specializations may seem more exotic to most
programmers.


### Conclusion
The RAII wrapper presented in the article resolves most of the shortcomings of
standard library smart pointers for managing resources of types other than
memory. To be specific:

- non-obvious declaration syntax for pointer type aliases;
- limited support for non-pointer types;
- awkward usage of managed resources with low-level APIs in comparison to
  unmanaged ones.

We have also become acquainted with a simple but interesting _static
polymorphism_ technique based on the usage of explicit template specialization.
Historically, explicit template specialization has had the fame of an advanced
language feature aimed mainly towards library implementers and experienced
users. As you can see however, it can play a much more prominent role of a core
abstraction mechanism on par with virtual functions, rather than being merely a
helpful utility in a library implementer's toolbox. I am convinced that the
full potential of this feature has yet to be unlocked.

[url-raii]: http://en.wikibooks.org/wiki/More_C++_Idioms/Resource_Acquisition_Is_Initialization
[url-exception-safety]: http://en.wikipedia.org/wiki/Exception_safety
[url-smart-pointer]: http://en.wikipedia.org/wiki/Smart_pointer
[url-nullable-pointer]: http://en.cppreference.com/w/cpp/concept/NullablePointer
[url-previous-post]: {% post_url 2015-01-17-providing-explicit-specializations-for-non-template-members-of-class-template %}
[url-explicit-specialization]: http://en.cppreference.com/w/cpp/language/template_specialization
[url-tag-dispatching]: http://www.boost.org/community/generic_programming.html#tag_dispatching
[url-windows-gdi]: https://msdn.microsoft.com/en-us/library/dd145203(v=vs.85).aspx
[url-n3949]: http://www.open-std.org/JTC1/SC22/WG21/docs/papers/2014/n3949.pdf
