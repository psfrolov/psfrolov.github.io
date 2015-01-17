---
title: Providing Explicit Specializations for Non-Template Members of Class Template
tags: cpp generic-programming
---

C++ is full of surprises (albeit not always good ones :-). It is a well known
fact that you can provide explicit specializations for function templates and
class templates. But it was a total surprise to me, that you can provide
explicit specializations for non-template members of class template without
specializing the class template itself!

### Technical Details
The following non-template members of class template can be explicitly
specialized:

* member function (either static or not);
* static data member;
* member enumeration (since C++11);
* member class.

Let's see some examples:
{% gist arkfps/c15788b10323bd4d5c54 %}

When this can be useful? Whenever you need some conditional logic for you
class template based on template parameters, but that logic takes only a small
fraction of class code. For example, you may have a class containing a dozen of
methods, but only a couple of them require behaviour specific to template
arguments. In that case, it is not practical to define explicit specialization
for the whole class due to large amount of code duplication. The better
solution is to define specializations only for those specific methods. Let's
see a concrete example.

Perhaps the most useful part of this feature is the ability to specialize
member functions. Let's take a look at a concrete example.

### Implementing Generic RAII Wrapper for Resource Handles
Opaque resource handles are used in many OS, networking and
database APIs. Usually such handles must be closed with some kind of
`close_handle` function. When dealing with handles in C++ you almost always
want to use RAII wrapper to avoid handle leaks. We can define such a wrapper as
follows:
{% highlight c++ %}
#include <cassert>
#include <memory>  // std::addressof

template<typename HandleType = OsHandle> class Handle {
public:
  Handle() = default;
  explicit Handle(HandleType handle) : handle_{ handle } {}

  ~Handle() { Cleanup(); }

  // Noncopyable.
  Handle(const Handle&) = delete;
  Handle& operator=(const Handle&) = delete;

  // Movable.
  Handle(Handle&& other) : handle_{ other.handle_ } { other.handle_ = {}; }
  Handle& operator=(Handle&& other) {
    assert(this != std::addressof(other));
    Cleanup();
    handle_ = other.handle_;
    other.handle_ = {};
    return *this;
  }

  HandleType* operator&() {
    Cleanup();
    return &handle_;
  }
   
  explicit operator HandleType() const { return handle_; }

private:
  void Cleanup() {
    if (handle_)
      CloseOsHandle(handle_);
  }

  HandleType handle_{};
};
{% endhighlight %}
Here `OsHandle` is some common handle type in our hypothetical operating system
which needs to be closed by `CloseOsHandle` function (the real world example is
Windows API `HANDLE` type with corresponding `CloseHandle` function). Example
usage:
{% highlight c++ %}
Handle<> handle1;  // using default handle type
Handle<OsHandle> handle2;  // same as above, explicit
Handle<OsFileHandle> handle3;  // OS-specific file handle
{% endhighlight %}
Now suppose we want to use `OsInternetHandle` which requires specific
`CloseOsInternetHandle` function to be closed (this is also common in Windows
API: for example, WinHttp `HINTERNET` handle requires `WinHttpCloseHandle`). We
can specialize our `Handle` class for `OsInternetHandle`:
{% highlight c++ %}
template<> class Handle<OsInternetHandle> {
public:
  Handle() = default;
  explicit Handle(OsInternetHandle handle) : handle_{ handle } {}

  ~Handle() { Cleanup(); }

  // Noncopyable.
  Handle(const Handle&) = delete;
  Handle& operator=(const Handle&) = delete;

  // Movable.
  Handle(Handle&& other) : handle_{ other.handle_ } { other.handle_ = {}; }
  Handle& operator=(Handle&& other) {
    assert(this != std::addressof(other));
    Cleanup();
    handle_ = other.handle_;
    other.handle_ = {};
    return *this;
  }

  OsInternetHandle* operator&() {
    Cleanup();
    return &handle_;
  }
   
  explicit operator OsInternetHandle() const { return handle_; }

private:
  void Cleanup() {
    if (handle_)
      CloseOsInternetHandle(handle_);
  }

  OsInternetHandle handle_{};
};
{% endhighlight %}
The problem is solved, but the cost is a lot of code duplication. As you
can see, the only real difference between specialization and primary template
is `Cleanup` method. Let's leave our `Handle` class definition as is and define
specialization for `Cleanup` member function instead:
{% highlight c++ %}
template<> void Handle<OsInternetHandle>::Cleanup() {
  if (handle_)
    CloseOsInternetHandle(handle_);
}
{% endhighlight %}
This is much better for maintainability and works exactly like the class
specialization above.

> Note that our handle wrapper is somewhat simplified. It assumes that various
`HandleType` arguments are in fact different types, not an aliases for some
built-in type like `int` or `void*`. For example, if our `OsHandle` and
`OsInternetHandle` are both defined as synonyms for `int`, the above
specialization will not work. For that reason, in real life you almost
certainly should apply [type-safe handle idiom][url-type-safe-handles] to your
wrapper class which is described in the recent [isocpp.org][url-isocpp] post by
Emil Ernerfeldt. Then you can specialize `Cleanup` method on handle tag (which
is effectively a form of [tag dispatching][url-tag-dispatching]).

### Conclusion
Although described in **Section 14.7 [temp.spec] of the C++ ISO/IEC standard**,
this unobvious feature is poorly documented elsewhere. In fact, I've found
only a couple of reference manuals mentioning it:

* [cppreference.com][url-cppreference];
* [z/OS XL C/C++ Language Reference][url-zos-xl-cpp-reference].

[url-cppreference]: http://en.cppreference.com/w/cpp/language/template_specialization
[url-zos-xl-cpp-reference]: http://www-01.ibm.com/support/knowledgecenter/SSLTBW_2.1.0/com.ibm.zos.v2r1.cbclx01/explicit_specialization.htm
[url-type-safe-handles]: https://isocpp.org/blog/2015/01/type-safe-handles-in-c-emil-ernerfeldt
[url-isocpp]: https://isocpp.org
[url-tag-dispatching]: http://isocpp.org/blog/2014/12/tag-dispatching
