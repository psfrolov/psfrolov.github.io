---
title: Making Boost.Signals2 More OOP-Friendly
tags: [Boost, C++, Design Patterns, Generic Programming, OOP]
image:
  url: /img/pages/observer-design-pattern.png
  source:
    name: Tom McFarlin
    url: http://tutsplus.com/authors/tom-mcfarlin
---

<span class="drop-letter">T</span><span>he</span> [observer design pattern]
[url-observer] is by far the most popular and widely known among [behavioural
patterns][url-behavioural-patterns]. Unfortunately, unlike other mainstream
languages out there, the C++ standard library doesn't provide out of the box
observer implementation. Luckily, [Boost][url-boost] contains [Signals2]
[url-signals2], a [signal/slot][url-signal-slot] library which can serve as a
basis for an observer. Using Signals2 as it is, however, is not so convenient
in object-oriented program due to the need of manually coded _register_ and
_notify_ class methods for each of signal/slot pairs. This article suggests an
_observable_ [mixin][url-mixin] which attempts to solve the outlined problem.

### Motivating Example

Suppose we are crafting a `Window` class for a GUI application:
{% highlight c++ %}
class Window {
public:
  void Show();
  bool Close(bool force_close = false);
  // ...    
};
{% endhighlight %}

The `Window` class is probably wrapping some third-party GUI library which is
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

For the sake of example, let's say that we are interested in only two events:
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
such as this, e.g., if there are no multiple handlers for a single event, we
can use just `std::function` instead of `boost::signals2::signal`):
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
real-world window class can easily contain dozens of them! The next section
will address this issue by presenting a convenient mixin class which
automatically generates the needed methods for you given the list of event
handler signatures. Think of [wxWidgets static event tables]
[url-wxwidgets-event-tables] or [MFC message maps][url-mfc-message-maps], but
without the use of macros. Or think of [Qt signals and slots]
[url-qt-signals-and-slots] or [Visual C++ event handling]
[url-vc-event-handling], but without the use of compiler extensions.

### Implementing an Observable Mixin

Here is a _class diagram_ which presents a high-level view on what we will
be discussing in this section. We'll continue to use the window example from
the previous section.
<figure>
  <img src="{{ site.baseurl }}/img/figures/observable-mixin-uml-class-diagram.png"
       alt="Observable Mixin UML Class Diagram">
  <figcaption>Observable Mixin UML Class Diagram</figcaption>
</figure>

#### The `WindowObservers` class

Obviously enough, we can't just put our signals into _homogeneous_ container
like `std::vector` because of different event signatures. Fortunately, the C++
standard library provides `std::tuple`, an integer-indexed _heterogenous
container_ which solves our needs (alternatively, we can use a tag-indexed
heterogeneous container, such as `boost::fusion::map`). With the help of
`std::tuple`, we can define an observer table for our `Window` class as shown
below:
{% highlight c++ %}
struct WindowObservers {
  enum { ShowEvent, CloseEvent };
  using ObserverTable = std::tuple<
    Observer<void()>,                 // ShowEvent
    Observer<bool(bool force_close)>  // CloseEvent
  >;
};
{% endhighlight %}

Here, we are making use of enumeration to index observers. This approach is not
ideal: an insertion or removal of an observer from the tuple definition may
cause a nasty bug if we are not careful enough to adjust the enumeration
accordingly. The tag-based heterogeneous containers are more immune to this
issue due to the fact that the tag is mentioned explicitly as part of container
element type.

#### The `Observer` class template

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

#### The `Observable` class template

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

#### The `Window` class

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

#### The `Application` class

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

### Putting It All Together

Here is a self-sufficient test program which puts together the above code
snippets:
{% gist arkfps/07887b173776ebbb4aac boost_signals_plus_std_tuple.cc %}

### Conclusion

In this article we have seen how modern C++ features, in particular, _variadic
templates_ and _perfect forwarding_ allow us to implement a generic variant of
observer pattern without the use of either macros or proprietary compiler
extensions.

I have also experimented with alternative implementations, namely, the one
based on `boost::fusion::map` instead of `std::tuple` and the other which uses
`std::function` instead of `boost::signals2::signal`. You can find them [here]
[url-observable-gist].

[url-observer]: https://sourcemaking.com/design_patterns/observer
[url-behavioural-patterns]: https://sourcemaking.com/design_patterns/behavioral_patterns
[url-boost]: http://www.boost.org
[url-signals2]: http://www.boost.org/doc/libs/release/libs/signals2/
[url-signal-slot]: https://en.wikipedia.org/wiki/Signals_and_slots
[url-mixin]: https://en.wikipedia.org/wiki/Mixin
[url-wxwidgets-event-tables]: http://docs.wxwidgets.org/trunk/overview_events.html#overview_events_eventtables
[url-mfc-message-maps]: https://msdn.microsoft.com/en-us/library/0x0cx6b1.aspx
[url-qt-signals-and-slots]: http://doc.qt.io/qt-5/signalsandslots.html
[url-vc-event-handling]: https://msdn.microsoft.com/en-us/library/ee2k0a7d(v=vs.120).aspx
[url-observable-gist]: https://gist.github.com/arkfps/07887b173776ebbb4aac
