---
uuid: urn:uuid:b5e5a495-748d-41bd-b31f-5b06229fdf09
title: Making Boost.Signals2 More OOP‐Friendly
tags: [Boost, C++, Design Patterns, Generic Programming, OOP]
description: &description >-
  Unfortunately, unlike other mainstream languages, the C++ standard library
  doesn’t provide out of the box observer implementation. This article suggests
  an observable mixin based on Boost.Signals2 which makes it easy to build an
  observer.
excerpt: *description
image:
  url: &url /img/pages/el-caracol-observatory.jpg
  path: *url
  name: &name El Caracol observatory temple, Chichen Itza, Mexico
  alt: *name
---

The _observer_[^fn-observer] design pattern is by far the most popular and
widely known among _behavioural patterns_[^fn-behavioural-patterns].
Unfortunately, unlike other mainstream languages out there, the C++ standard
library doesn't provide out of the box observer implementation. Luckily,
[Boost][url-boost] contains [Signals2][url-signals2], a
_signal/slot_[^fn-signals-slots] library which can serve as a basis for an
observer. Using Signals2 as it is, however, is not so convenient in
object‐oriented program due to the need of manually coded _register_ and
_notify_ class methods for each of signal/slot pairs. This article suggests
an _observable_ _mixin_[^fn-mixin] which attempts to solve the outlined
problem.

## Motivating Example

Suppose we are crafting a `Window` class for a GUI application:
{% highlight c++ %}
class Window {
public:
    void Show();
    bool Close(bool force_close = false);
    // ...
};
{% endhighlight %}

The `Window` class is probably wrapping some third‐party GUI library which is
irrelevant for our example. What is relevant, however, is that there exists an
`Application` class which wants to receive notifications whenever something
happens in the `Window`:
{% highlight c++ %}
class Application {
public:
    explicit Application(Window& window);
    // ...

private:
    void OnWindowShow();
    bool OnWindowClose(bool force_close);
    // ...

    Window& window_;
    // ...
};
{% endhighlight %}

For the sake of example, let’s say that we are interested in only two events:
`ShowEvent` and `CloseEvent`:
{% highlight c++ %}
using ShowEvent = void();
using CloseEvent = bool(bool force_close);
{% endhighlight %}

The `ShowEvent` is an information only event which is fired whenever the window
is shown. On the other hand, the obviously purposed `CloseEvent` lets the user
cancel the close operation by returning the value `false`, but only if the
`force_close` flag is also `false` (otherwise the return value is ignored by
the window).

Let us define the two events mentioned along with corresponding _register_ and
_notify_ methods with the help of Boost.Signals2 (note, in the simplest cases
such as this, e.g. if there are no multiple handlers for a single event, we can
use just `std::function` instead of `boost::signals2::signal`):
{% highlight c++ %}
class Window {
public:
    void Show();
    bool Close(bool force_close = false);
    // ...

    template<typename F>
    boost::signals2::connection
    RegisterShowObserver(F&& f) {
        return show_signal_.connect(std::forward<F>(f));
    }

    template<typename F>
    boost::signals2::connection
    RegisterCloseObserver(F&& f) {
        return close_signal_.connect(std::forward<F>(f));
    }

    // More registrars...

protected:
    void NotifyShowObservers() const {
        show_signal_();
    }

    boost::optional<bool> NotifyCloseObservers(bool force_close) const {
        return close_signal_(force_close);
    }

    // More notifiers...

private:
    boost::signals2::signal<void()> show_signal_;
    boost::signals2::signal<bool(bool force_close)> close_signal_;
    // More signals...
};
{% endhighlight %}

The main issue with the above code, as you can see, is that _register_ and
_notify_ methods need to be written manually for each of events. And a
real‐world window class can easily contain dozens of them! The next section
will address this issue by presenting a convenient mixin class which
automatically generates the needed methods for you given the list of event
handler signatures. Think of [wxWidgets static event tables]
[url-wxwidgets-event-tables] or [MFC message maps][url-mfc-message-maps], but
without the use of macros. Or think of [Qt signals and slots]
[url-qt-signals-and-slots] or [Visual C++ event handling]
[url-vc-event-handling], but without the use of compiler extensions.

## Implementing Observable Mixin

Here is a _UML_[^fn-uml] _class diagram_[^fn-class-diagram] which presents a
high‐level view on what we will be discussing in this section. We’ll continue
to use the window example from the previous section.
<figure style="--aspect-ratio: calc(676 / 556);">
  <object data="/img/figures/observable-mixin-uml-class-diagram.svg"
          type="image/svg+xml"
          role="img">
  </object>
  <figcaption>Observable Mixin UML Class Diagram</figcaption>
</figure>

### The WindowObservers Class

Obviously enough, we can’t just put our signals into _homogeneous_ container
like `std::vector` because of different event signatures. Fortunately, the C++
standard library provides `std::tuple`, an integer‐indexed _heterogeneous
container_ which solves our needs (alternatively, we can use a tag‐indexed
heterogeneous container, such as `boost::fusion::map`). With the help of
`std::tuple`, we can define an observer table for our `Window` class as shown
below:
{% highlight c++ %}
struct WindowObservers {
    enum { ShowEvent, CloseEvent };
    using ObserverTable = std::tuple<
        Observer<void()>,  // ShowEvent
        Observer<bool(bool force_close)>  // CloseEvent
    >;
};
{% endhighlight %}

Here, we are making use of enumeration to index observers. This approach is not
ideal: an insertion or removal of an observer from the tuple definition may
cause a nasty bug if we are not careful enough to adjust the enumeration
accordingly. The tag‐based heterogeneous containers are more immune to this
issue due to the fact that the tag is mentioned explicitly as part of container
element type.

### The Observer Class Template

The `Observer` type used in the above code fragment is just a simple
convenience wrapper for `boost::signals2::signal`:
{% highlight c++ %}
template<typename Signature> class Observer {
public:
    Observer(const Observer&) = delete;
    Observer& operator=(const Observer&) = delete;
    Observer() = default;

private:
    template<typename Observers> friend class Observable;

    using Signal = boost::signals2::signal<Signature>;
    using SignalResult = typename Signal::result_type;

    Signal signal_;
};
{% endhighlight %}

Aside from the signal itself, the type contains a couple of convenience type
aliases and a friend declaration for the `Observable` class.

### The Observable Class Template

The `Observable` class is what makes use of our `WindowObservers` structure to
generate the corresponding registration and notification methods:
{% highlight c++ %}
template<typename Observers> class Observable {
private:
    using ObserverTable = typename Observers::ObserverTable;

public:
    // Registers an observer.
    template<size_t ObserverId, typename F>
    boost::signals2::connection
    Register(F&& f) {
        return std::get<ObserverId>(signals_).signal_.connect(std::forward<F>(f));
    }

protected:
    Observable() = default;

    // Notifies observers.
    template<size_t ObserverId, typename... Args>
    typename std::tuple_element<ObserverId, ObserverTable>::type::SignalResult
    Notify(Args&&... args) const {
        return std::get<ObserverId>(signals_).signal_(std::forward<Args>(args)...);
    }

private:
    ObserverTable signals_;
};
{% endhighlight %}

The `Observable` class maintains a table (`std::tuple` in our case) of
observers the definition of which is passed as class template parameter
`Observers`. An example of such an argument is the `WindowObervers` structure
defined earlier.

The class provides `Register` method which is used obviously for observers
registration. The function takes an arbitrary callable object (whatever
Boost.Signals2 happens to support as a slot type), represented by `F&& f`
parameter, and an index into the tuple (`ObserverId` template parameter). The
function returns `boost::signals2::connection` object which can be used later
to unregister the observer.

The class also has `Notify` method which invokes callable objects registered
earlier for particular observer kind (which is given by the means of the
`ObserverId` template argument). The `Notify` method forwards its function
arguments (`args`) to the callable object. The function returns the result of
the last slot called, wrapped into `boost::optional` (this is the default
behaviour of `boost::signals2::signal`; see the Boost.Signals2 documentation in
case you need an advanced return semantic).

The constructor of the class is made protected because this class is not
intended to be used on its own.

### The Window Class

Our `Window` class now derives from `Observable` class template parametrised by
`WindowsObservers`. This give us a possibility to use `Register` and `Notify`
methods on `Window` instances.
{% highlight c++ %}
class Window: public Observable<WindowObservers> {
public:
    void Show() {
        // ...
        Notify<WindowObservers::ShowEvent>();
    }

    bool Close(bool force_close = false) {
        const boost::optional<bool> can_close{
            Notify<WindowObservers::CloseEvent>(force_close) };
        const bool closing{ force_close || !can_close || *can_close };
        if (closing) {
            // Actually close the window.
            // ...
        }
        return closing;
    }

    // ...
};
{% endhighlight %}

### The Application Class

Finally, the application class registers the callbacks for
`WindowObservers::ShowEvent` and `WindowObservers::CloseEvent` events:
{% highlight c++ %}
class Application {
public:
    explicit Application(Window& window) : window_(window) {
        window_.Register<WindowObservers::ShowEvent>([this]() {
            OnWindowShow();
        });
        window.Register<WindowObservers::CloseEvent>([this](bool force_close) {
            return OnWindowClose(force_close);
        });
    }

    // ...

private:
    void OnWindowShow() {
        // ...
    }

    bool OnWindowClose(bool force_close) {
        // ...
        return force_close;
    }

    Window& window_;
        // ...
};
{% endhighlight %}

## Putting It All Together

Here is a self‐sufficient test program which puts together the above code
snippets:
{% highlight c++ %}
//-----------------------------------------------------------------------------
// Observable mixin.
//-----------------------------------------------------------------------------

#include <tuple>
#include <utility>

#include <boost/signals2.hpp>


// Convenience wrapper for boost::signals2::signal.
template<typename Signature> class Observer {
public:
    Observer(const Observer&) = delete;
    Observer& operator=(const Observer&) = delete;
    Observer() = default;

private:
    template<typename Observers> friend class Observable;

    using Signal = boost::signals2::signal<Signature>;
    using SignalResult = typename Signal::result_type;

    Signal signal_;
};


// Generic observable mixin - users must derive from it.
template<typename Observers> class Observable {
private:
    using ObserverTable = typename Observers::ObserverTable;

public:
    // Registers an observer.
    template<size_t ObserverId, typename F>
    boost::signals2::connection
    Register(F&& f) {
        return std::get<ObserverId>(signals_).signal_.connect(std::forward<F>(f));
    }

protected:
    Observable() = default;

    // Notifies observers.
    template<size_t ObserverId, typename... Args>
    typename std::tuple_element<ObserverId, ObserverTable>::type::SignalResult
    Notify(Args&&... args) const {
        return std::get<ObserverId>(signals_).signal_(std::forward<Args>(args)...);
    }

private:
    ObserverTable signals_;
};


//-----------------------------------------------------------------------------
// Example usage.
//-----------------------------------------------------------------------------

#include <iostream>


// Defines observers for Windows class.
struct WindowObservers {
    enum { ShowEvent, CloseEvent };
    using ObserverTable = std::tuple<
        Observer<void()>,                 // ShowEvent
        Observer<bool(bool force_close)>  // CloseEvent
    >;
};


// Window: our Observable.
class Window: public Observable<WindowObservers> {
public:
    void Show() {
        std::cout << "Window::Show called." << std::endl;
        Notify<WindowObservers::ShowEvent>();
        std::cout << "Window::Show handled." << std::endl << std::endl;
    }

    bool Close(bool force_close = false) {
        std::cout << "Window::Close called: force_close == "
            << std::boolalpha << force_close << "." << std::endl;

        const boost::optional<bool> can_close{
            Notify<WindowObservers::CloseEvent>(force_close) };
        std::cout << "Window::Close handled. can_close == "
            << std::boolalpha << (!can_close || *can_close) << "."
            << std::endl << std::endl;

        const bool closing{ force_close || !can_close || *can_close };
        if (closing) {
            // Actually close the window.
            // ...
        }
        return closing;
    }
};

// Application: our Observer.
class Application {
public:
    explicit Application(Window& window) : window_(window) {
        // Register window observers.
        window_.Register<WindowObservers::ShowEvent>([this]() {
            OnWindowShow();
        });
        window.Register<WindowObservers::CloseEvent>([this](bool force_close) {
            return OnWindowClose(force_close);
        });
    }

private:
    void OnWindowShow() {
        std::cout << "Application::OnWindowShow called." << std::endl;
    }

    bool OnWindowClose(bool force_close) {
        std::cout << "Application::WindowClose called: force_close == "
            << std::boolalpha << force_close << "." << std::endl;
        return force_close;
    }

    Window& window_;
};


int main() {
    Window window;
    Application application{ window };

    // Notify observers.
    window.Show();
    //...
    window.Close(false);
    window.Close(true);
}
{% endhighlight %}

## Conclusion

In this article we have seen how modern C++ features, in particular, _variadic
templates_ and _perfect forwarding_ allow us to implement a generic variant of
observer pattern without the use of either macros or proprietary compiler
extensions.

I have also experimented with alternative implementations, namely, the one
based on `boost::fusion::map` instead of `std::tuple` and the other which uses
`std::function` instead of `boost::signals2::signal`. You can find them in a
[gist][url-observable-gist].

---

## Footnotes
{: .screenreader-only }

[^fn-observer]:
    A software design pattern in which an object, called the subject,
    maintains a list of its dependents, called observers, and notifies them
    automatically of any state changes, usually by calling one of their
    methods. The [observer pattern][url-observer] is also a key part in the
    model–view–controller (MVC) architectural pattern.

[^fn-behavioural-patterns]:
    Used to manage relationships, interaction, algorithms and responsibilities
    between objects. The [behavioural pattern][url-behavioural-patterns]
    focuses on the interaction between the cooperating objects in a manner that
    the objects are communicating while maintaining loose coupling.

[^fn-signals-slots]:
    A language construct for communication between objects which makes it easy
    to implement the Observer pattern while avoiding boilerplate code. For
    example, GUI widgets can send signals containing event information which can
    be received by other controls using special functions known as slots.

[^fn-mixin]:
    A class that acts as the parent class, containing the desired
    functionality. A subclass can then inherit or simply reuse this
    functionality, but without creating a rigid, single ‘is a’ relationship
    ([Wikipedia][url-mixin]).

[^fn-uml]:
    A general‐purpose, developmental, modeling language in the field of
    software engineering, that is intended to provide a standard way to
    visualize the design of a system ([Wikipedia][url-uml]).

[^fn-class-diagram]:
    In the UML a type of static structure diagram that describes the structure
    of a system by showing the system’s classes, their attributes, operations
    (or methods), and the relationships among objects
    ([Wikipedia][url-class-diagram]).

[url-observer]: https://sourcemaking.com/design_patterns/observer
{: rel="external" }
[url-behavioural-patterns]: https://sourcemaking.com/design_patterns/behavioral_patterns
{: rel="external" }
[url-boost]: http://www.boost.org
{: rel="external" }
[url-signals2]: http://www.boost.org/doc/libs/release/libs/signals2/
{: rel="external" }
[url-mixin]: https://en.wikipedia.org/wiki/Mixin
{: rel="external" }
[url-wxwidgets-event-tables]: http://docs.wxwidgets.org/trunk/overview_events.html#overview_events_eventtables
{: rel="external" }
[url-mfc-message-maps]: https://msdn.microsoft.com/en-us/library/0x0cx6b1.aspx
{: rel="external" }
[url-qt-signals-and-slots]: https://doc.qt.io/qt-5/signalsandslots.html
{: rel="external" }
[url-vc-event-handling]: https://msdn.microsoft.com/en-us/library/ee2k0a7d(v=vs.120).aspx
{: rel="external" }
[url-uml]: https://en.wikipedia.org/wiki/Unified_Modeling_Language
{: rel="external" }
[url-class-diagram]: https://en.wikipedia.org/wiki/Class_diagram
{: rel="external" }
[url-observable-gist]: https://gist.github.com/psfrolov/07887b173776ebbb4aac
{: rel="external" }
