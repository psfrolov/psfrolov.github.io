---
uuid: urn:uuid:09e7137d-33df-4c82-bfde-574f3289bea6
title: Providing Explicit Specialisations for Non‐Template Members of Class Template
tags: [C++, Generic Programming]
description: &description 'It is a well-known fact that you can provide explicit specialisations for function templates and class templates. But it was a total surprise to me that you can define explicit specialisations for non‐template members of class template without specialising the class template itself!'
excerpt: *description
image:
  url: &url /img/pages/goethe-schiller-monument.jpg
  path: *url
  name: &name <i>Goethe – Schiller Monument</i>, Syracuse, New York State
  alt: *name
---

C++ is full of surprises (albeit not always good ones). {{ page.description }}

## Technical Details

The following non‐template members of class template can be explicitly specialised:

* member function (either static or not);
* static data member;
* member enumeration (since <span class="c2sc">C</span>++11);
* member class.

Let’s see some examples:
{% highlight c++ %}
#include <iostream>
#include <string>


template<typename T> class Foo {
public:
    std::string Method();
    static std::string StaticMethod();
    static const std::string StaticData;
    enum class Enum;
    struct InnerStruct{ static const std::string StaticData; };
};

template<typename T> std::string Foo<T>::Method() {
    return "std::string Foo<T>::Method() - primary template.";
}

template<> std::string Foo<char>::Method() {
    return "std::string Foo<T>::Method() - "
        "explicit specialisation for <char>.";
}

template<typename T> std::string Foo<T>::StaticMethod() {
    return "std::string Foo<T>::StaticMethod() - primary template.";
}

template<> std::string Foo<char>::StaticMethod() {
    return "std::string Foo<char>::StaticMethod() - "
        "explicit specialisation for <char>.";
}

template<typename T> const std::string Foo<T>::StaticData{
    "std::string Foo<T>::StaticData - primary template." };

template<> const std::string Foo<char>::StaticData{
    "std::string Foo<char>::StaticData - "
    "explicit specialisation for <char>." };

template<typename T> enum class Foo<T>::Enum { Primary = 0 };

template<> enum class Foo<char>::Enum { Specialised = 1 };

template<typename T> const std::string Foo<T>::InnerStruct::StaticData{
    "std::string Foo<T>::InnerStruct::StaticData - primary template." };

template<> struct Foo<char>::InnerStruct{
    static const std::string StaticData; };
const std::string Foo<char>::InnerStruct::StaticData{
    "std::string Foo<char>::InnerStruct::StaticData - "
    "explicit specialisation for <char>." };


int main() {
    // Member function.
    std::cout << Foo<int>().Method() << std::endl;
    std::cout << Foo<char>().Method() << std::endl;

    // Static member function.
    std::cout << Foo<int>::StaticMethod() << std::endl;
    std::cout << Foo<char>::StaticMethod() << std::endl;

    // Static data member.
    std::cout << Foo<int>::StaticData << std::endl;
    std::cout << Foo<char>::StaticData << std::endl;

    // Member enumeration.
    std::cout << static_cast<int>(Foo<int>::Enum::Primary) << std::endl;
    std::cout << static_cast<int>(Foo<char>::Enum::Specialised) << std::endl;

    // Member class.
    std::cout << Foo<int>::InnerStruct::StaticData << std::endl;
    std::cout << Foo<char>::InnerStruct::StaticData << std::endl;
}
{% endhighlight %}

When this can be useful? Whenever you need some conditional logic for you class template based on template parameters, but that logic takes only a small fraction of class code. For example you may have a class containing a dozen of methods, but only a couple of them require behaviour specific to template arguments. In that case, it is not practical to define explicit specialisation for the whole class due to large amount of code duplication. The better solution is to define specialisations only for those specific methods.

Perhaps the most useful part of this feature is the ability to specialise member functions. Let’s take a look at a concrete example.

## Implementing Generic RAII Wrapper for Resource Handles

Opaque resource handles are used in many OS‐level, networking, and database APIs. Usually such handles must be closed with some kind of _close_handle_ function. When dealing with handles in C++ you almost always want to use RAII wrapper to avoid handle leaks. We can define such a wrapper as follows:
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
Here `OsHandle` is some common handle type in our hypothetical operating system which needs to be closed by `CloseOsHandle` function (the real world example is Windows API `HANDLE` type with corresponding `CloseHandle` function). Example usage:
{% highlight c++ %}
Handle<> handle1;  // using default handle type
Handle<OsHandle> handle2;  // same as above, explicit
Handle<OsFileHandle> handle3;  // OS-specific file handle
{% endhighlight %}
Now suppose we want to use `OsInternetHandle` which requires specific `CloseOsInternetHandle` function to be closed (this is also common in Windows API: for example WinHttp `HINTERNET` handle requires `WinHttpCloseHandle`). We can specialise our `Handle` class for `OsInternetHandle`:
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
The problem is solved, but the cost is a lot of code duplication. As you can see, the only real difference between specialised and primary template is `Cleanup` method. Let’s leave our `Handle` class definition as is and define specialisation for `Cleanup` member function instead:
{% highlight c++ %}
template<> void Handle<OsInternetHandle>::Cleanup() {
    if (handle_)
        CloseOsInternetHandle(handle_);
}
{% endhighlight %}
This is much better for maintainability and works exactly like the class specialisation above.

Note that our handle wrapper is somewhat simplified for the purpose of the article. It is assumed that various `HandleType` arguments are in fact different types, not an aliases for some built‐in type like `int` or `void*`. For example if our `OsHandle` and `OsInternetHandle` are both defined as synonyms for `int`, the above specialisation will not work. For that reason, in real life you almost certainly should apply [type‐safe handle idiom][url-type-safe-handles] to your wrapper class described in the recent [isocpp.org][url-isocpp] post by Emil Ernerfeldt. Then you can specialise `Cleanup` method on handle tag (which is effectively a form of _tag dispatching_[^fn-tag-dispatching]).

## Conclusion

Although described in <cite>Section 14.7 [temp.spec] of the C++ ISO/IEC standard</cite>, this unobvious feature is poorly documented elsewhere. In fact, I’ve found only a couple of reference manuals mentioning it:

* [cppreference.com][url-cppreference];
* [z/OS XL C/C++ Language Reference][url-zos-xl-cpp-reference].

---

## Footnotes
{: .screenreader-only }

[^fn-tag-dispatching]:
    Tag dispatching is a way of using function overloading to dispatch based on properties of a type. See [tutorial on tag dispatching][url-tag-dispatching].

[url-cppreference]: http://en.cppreference.com/w/cpp/language/template_specialization
{: rel="external" }
[url-zos-xl-cpp-reference]: https://www.ibm.com/support/knowledgecenter/SSLTBW_2.1.0/com.ibm.zos.v2r1.cbclx01/explicit_specialization.htm
{: rel="external" }
[url-type-safe-handles]: https://isocpp.org/blog/2015/01/type-safe-handles-in-c-emil-ernerfeldt
{: rel="external" }
[url-isocpp]: https://isocpp.org
{: rel="external" }
[url-tag-dispatching]: https://isocpp.org/blog/2014/12/tag-dispatching
{: rel="external" }
