---
title: Providing Explicit Specializations for Non-Template Members of Class Template
tags: cpp generic-programming
---

C++ is full of surprises (albeit not always good ones). It is a well known fact
that you can provide explicit specializations for function templates and class
templates. But it was a total surprise to me, that you can provide explicit
specializations for non-template members of class template without specializing
the class template itself!

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
solution is to define specializations only for those specific methods.

Although described in **Section 14.7 [temp.spec] of the C++ ISO/IEC standard**,
this unobvious feature is poorly documented elsewhere. In fact, I've found
only a couple of reference manuals mentioning it:

* [cppreference.com][url-cppreference];
* [z/OS XL C/C++ Language Reference][url-zos-xl-cpp-reference].

[url-cppreference]: http://en.cppreference.com/w/cpp/language/template_specialization
[url-zos-xl-cpp-reference]: http://www-01.ibm.com/support/knowledgecenter/SSLTBW_2.1.0/com.ibm.zos.v2r1.cbclx01/explicit_specialization.htm
