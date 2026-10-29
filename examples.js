/* Generated from examples/*.az — run build-examples.js after editing them. */
window.AZ_EXAMPLES = [
  {
    "id": "hello",
    "icon": "👋",
    "title": "Hello, world",
    "desc": "Variables, strings, and a first program",
    "tag": "Basics",
    "code": "# Hello, world!\n# Run this file with:  node azlang.js examples/hello.az\n\nsay \"Hello, world!\"\nsay \"سلام! AzLang fully supports Persian text.\"   # Unicode strings just work\n\nlet name = \"friend\"\nlet year = 2026\n\nsay \"Welcome, {name}!\"\nsay \"This year is {year}.\"\n\n# Strings can be joined with + or embedded with { }\nsay \"Goodbye, \" + name + \"!\"\n"
  },
  {
    "id": "tour",
    "icon": "✨",
    "title": "Language tour",
    "desc": "A guided tour of the entire language",
    "tag": "Overview",
    "code": "# A quick tour of AzLang\n\n# --- values ---\nlet title = \"AzLang\"\nlet version = 2.0\nlet stable = true\nlet nothing = null\nlet colors = [\"red\", \"green\", \"blue\"]\nlet scores = {Ada: 95, Grace: 98}\n\nsay \"{title} {version}\"\nsay type(title), type(version), type(stable), type(nothing)\nsay type(colors), type(scores), type(x => x)\n\n# --- conditions ---\nif version >= 2.0\n  say \"Modern version\"\nelif version >= 1.0\n  say \"Classic version\"\nelse\n  say \"Old version\"\nend\n\n# --- loops ---\nfor i in range(1, 4)\n  say \"Step {i}\"\nend\n\nlet total = 0\nfor value in [10, 20, 30]\n  total += value\nend\nsay \"Total: {total}\"\n\n# --- functions and lambdas ---\nfun greet(name, punctuation = \"!\")\n  return \"Hello, \" + name + punctuation\nend\n\nsay greet(\"Ada\")\nsay greet(\"Grace\", \"?\")\n\nlet square = x => x * x\nsay \"Squares: {map(range(1, 6), square)}\"\n\n# --- collections ---\nappend(colors, \"black\")\nprepend(colors, \"white\")\nsay colors\nsay \"Even numbers: {filter(range(10), n => n % 2 == 0)}\"\n\nscores[\"Linus\"] = 99\nfor name, score in scores\n  say \"{name}: {score}\"\nend\n\n# --- classes ---\nclass Greeter\n  fun init(name)\n    this.name = name\n  end\n\n  fun greet()\n    return \"Hi, \" + this.name + \"!\"\n  end\nend\n\nlet greeter = new Greeter(\"world\")\nsay greeter.greet()\n\n# --- match ---\nfun size(n)\n  match n\n    case 0\n      return \"zero\"\n    case 1, 2, 3\n      return \"small\"\n    case _\n      return \"large\"\n  end\nend\nsay size(2), size(100)\n\n# --- exceptions ---\ntry\n  throw {message: \"Something went wrong\", code: 42}\ncatch problem\n  say \"Caught: {problem.message} (code {problem.code})\"\nend\n\n# --- raw strings ---\nlet data = json_decode(r'{\"language\": \"AzLang\", \"year\": 2026}')\nsay data.language, data.year\n\nsay \"Tour complete.\"\n"
  },
  {
    "id": "fibonacci",
    "icon": "🌀",
    "title": "Fibonacci",
    "desc": "Recursion, caching, and a fast loop",
    "tag": "Functions",
    "code": "# Fibonacci numbers, with a cache for speed\n\nlet cache = {0: 0, 1: 1}\n\nfun fib(n)\n  if has(cache, n)\n    return cache[n]\n  end\n  let value = fib(n - 1) + fib(n - 2)\n  cache[n] = value\n  return value\nend\n\nsay \"The first 15 Fibonacci numbers:\"\nfor i in range(15)\n  say \"fib({i}) = {fib(i)}\"\nend\n\n# An iterative version, for comparison\nfun fib_fast(n)\n  let a = 0\n  let b = 1\n  repeat n\n    let next = a + b\n    a = b\n    b = next\n  end\n  return a\nend\n\nsay \"fib_fast(50) = {fib_fast(50)}\"\n"
  },
  {
    "id": "guessing-game",
    "icon": "🎯",
    "title": "Guessing game",
    "desc": "Random numbers, loops, and input",
    "tag": "Interactive",
    "code": "# Number guessing game\n# The computer picks a number; you try to find it.\n\nlet secret = random(1, 100)\nlet attempts = 0\nlet max_attempts = 7\nlet won = false\n\nsay \"I am thinking of a number between 1 and 100.\"\nsay \"You have {max_attempts} attempts.\"\n\nwhile attempts < max_attempts\n  attempts += 1\n  let raw = trim(input(\"Guess #{attempts}: \"))\n\n  if raw == \"\"\n    say \"No input received. Goodbye!\"\n    break\n  end\n\n  try\n    let guess = num(raw)\n  catch problem\n    say \"That is not a number. Try again.\"\n    continue\n  end\n\n  if guess < secret\n    say \"Higher!\"\n  elif guess > secret\n    say \"Lower!\"\n  else\n    say \"Correct! You found it in {attempts} attempts.\"\n    won = true\n    break\n  end\nend\n\nif not won\n  say \"Out of attempts. The number was {secret}.\"\nend\n"
  },
  {
    "id": "inventory",
    "icon": "📦",
    "title": "Inventory",
    "desc": "Classes, maps, JSON, and errors",
    "tag": "Classes",
    "code": "# Inventory: classes, lists, maps, JSON, and errors\n\nclass Item\n  fun init(name, quantity, price)\n    this.name = name\n    this.quantity = quantity\n    this.price = price\n  end\n\n  fun value()\n    return this.quantity * this.price\n  end\n\n  fun label()\n    return \"{this.name} x{this.quantity} @ {this.price}\"\n  end\nend\n\nclass Inventory\n  fun init()\n    this.items = []\n  end\n\n  fun add(item)\n    if item.quantity < 0\n      throw {message: \"Quantity cannot be negative\", code: \"bad_quantity\"}\n    end\n    append(this.items, item)\n    return this\n  end\n\n  fun total_value()\n    let total = 0\n    for item in this.items\n      total += item.value()\n    end\n    return round(total, 2)\n  end\n\n  fun report()\n    say \"Inventory report\"\n    say \"----------------\"\n    for item in this.items\n      say \"- {item.label()} = {round(item.value(), 2)}\"\n    end\n    say \"Total: {this.total_value()}\"\n  end\nend\n\nlet store = new Inventory()\nstore.add(new Item(\"Keyboard\", 4, 49.99))\nstore.add(new Item(\"Mouse\", 10, 19.50))\nstore.add(new Item(\"Monitor\", 3, 189.00))\n\nstore.report()\nsay \"\"\n\n# Higher-order helpers over the item list\nlet names = map(store.items, item => item.name)\nsay \"Products: {join(names, ', ')}\"\n\nlet expensive = filter(store.items, item => item.price > 40)\nsay \"Expensive: {map(expensive, item => item.name)}\"\n\n# Errors are values; catch and handle them\ntry\n  store.add(new Item(\"Broken\", -1, 10))\ncatch problem\n  say \"Could not add item: {problem.message} ({problem.code})\"\nend\n\n# Export the summary as JSON\nlet summary = {\n  products: len(store.items),\n  total: store.total_value(),\n  names: names\n}\nsay json_encode(summary)\n"
  },
  {
    "id": "word-count",
    "icon": "📊",
    "title": "Word frequency",
    "desc": "Strings, maps, and higher-order functions",
    "tag": "Collections",
    "code": "# Word frequency counter\n# Demonstrates maps, string functions, lambdas, and manual sorting.\n\nlet text = \"the quick brown fox jumps over the lazy dog the fox is quick\"\n\nlet counts = {}\nfor word in split(lower(text))\n  if has(counts, word)\n    counts[word] += 1\n  else\n    counts[word] = 1\n  end\nend\n\n# Turn the map into [word, count] pairs\nlet pairs = items(counts)\n\n# Sort by count, largest first (a simple bubble sort)\nfun sort_by_count(list)\n  repeat len(list)\n    for i in range(len(list) - 1)\n      if list[i][1] < list[i + 1][1]\n        let temp = list[i]\n        list[i] = list[i + 1]\n        list[i + 1] = temp\n      end\n    end\n  end\n  return list\nend\n\nsort_by_count(pairs)\n\nsay \"Top words:\"\nfor pair in slice(pairs, 0, 5)\n  say \"{pair[0]}: {pair[1]}\"\nend\n\nsay \"Unique words: {len(pairs)}\"\nsay \"Total words: {len(split(text))}\"\n\n# Find words that appear more than once\nlet repeated = filter(keys(counts), word => counts[word] > 1)\nsay \"Repeated: {join(sort(repeated), ', ')}\"\n"
  },
  {
    "id": "bank",
    "icon": "🏦",
    "title": "Bank account",
    "desc": "Validation, custom errors, and history",
    "tag": "Exceptions",
    "code": "# A tiny bank: classes, validation, and exception handling\n\nclass Account\n  fun init(owner, balance = 0)\n    this.owner = owner\n    this.balance = balance\n    this.history = []\n  end\n\n  fun deposit(amount)\n    if amount <= 0\n      throw {message: \"Deposit must be positive\", code: \"bad_amount\"}\n    end\n    this.balance += amount\n    append(this.history, \"deposit \" + str(amount))\n    return this.balance\n  end\n\n  fun withdraw(amount)\n    if amount <= 0\n      throw {message: \"Withdrawal must be positive\", code: \"bad_amount\"}\n    end\n    if amount > this.balance\n      throw {message: \"Not enough funds\", code: \"no_funds\", balance: this.balance}\n    end\n    this.balance -= amount\n    append(this.history, \"withdraw \" + str(amount))\n    return this.balance\n  end\n\n  fun summary()\n    return \"{this.owner}: {this.balance}\"\n  end\nend\n\nlet account = new Account(\"Ada\", 100)\nsay account.summary()\n\naccount.deposit(50)\nsay \"After deposit: {account.balance}\"\n\ntry\n  account.withdraw(500)\ncatch problem\n  say \"Failed: {problem.message}\"\n  say \"Available: {problem.balance}\"\nend\n\ntry\n  account.deposit(-10)\ncatch problem\n  say \"Failed: {problem.message} ({problem.code})\"\nend\n\naccount.withdraw(30)\nsay account.summary()\nsay \"Operations: {len(account.history)}\"\n"
  },
  {
    "id": "shapes",
    "icon": "🔷",
    "title": "Shapes",
    "desc": "Inheritance, super, and polymorphism",
    "tag": "Classes",
    "code": "# Shapes: inheritance, super, and polymorphism\n\nclass Shape\n  fun init(name)\n    this.name = name\n  end\n\n  fun area()\n    return 0\n  end\n\n  fun describe()\n    return \"{this.name} with area {round(this.area(), 2)}\"\n  end\nend\n\nclass Circle extends Shape\n  fun init(radius)\n    super(\"Circle\")\n    this.radius = radius\n  end\n\n  fun area()\n    return PI * this.radius ** 2\n  end\nend\n\nclass Rectangle extends Shape\n  fun init(width, height)\n    super(\"Rectangle\")\n    this.width = width\n    this.height = height\n  end\n\n  fun area()\n    return this.width * this.height\n  end\nend\n\nclass Triangle extends Shape\n  fun init(base, height)\n    super(\"Triangle\")\n    this.base = base\n    this.height = height\n  end\n\n  fun area()\n    return this.base * this.height / 2\n  end\nend\n\nlet shapes = [\n  new Circle(2),\n  new Rectangle(3, 4),\n  new Triangle(6, 5)\n]\n\nfor shape in shapes\n  say shape.describe()\nend\n\nlet total = 0\nfor shape in shapes\n  total += shape.area()\nend\nsay \"Combined area: {round(total, 2)}\"\n\n# Find the largest shape\nfun larger(a, b)\n  if a.area() >= b.area()\n    return a\n  end\n  return b\nend\n\nlet largest = reduce(shapes, larger)\nsay \"Largest: {largest.describe()}\"\n"
  }
];
