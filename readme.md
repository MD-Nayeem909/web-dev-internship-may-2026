## Steps
1. Question Parse
2. BST (Binary Search Tree) -> Preorder Sorting
3. Database Input/Push
4. Private Repository -> VPS Store

## Sample Text Input For Parsing

```
১। প্রথম জাতীয় বননীতি ঘোষিত হয় কত সালে?
ক. ১৯৬৩ সালে
খ. ১৯৬৪ সালে
গ. ১৯৬৫ সালে
ঘ. ১৯৬৮ সালে
২। প্রথম মহিলা কারাগার কোথায় অবস্থিত?
ক. ঢাকা
খ. গাজীপুর
গ. যশোর
ঘ. সিলেট

উত্তরমালা (Answer Key)
১। গ. ১৯৬৫ সালে
২। খ. গাজীপুর
```

## Database

### Database Schema

```sql
CREATE TABLE questions (
     id SERIAL PRIMARY KEY,
     user_id INT,
     question TEXT NOT NULL,
     option_a TEXT NOT NULL,
     option_b TEXT NOT NULL,
     option_c TEXT NOT NULL,
     option_d TEXT NOT NULL,
     answer VARCHAR(10) NOT NULL
)
```

### Database Table Example

| ID  | Question                                               | Option A    | Option B        | Option C         | Option D   | Answer   |
| --- | ------------------------------------------------------ | ----------- | --------------- | ---------------- | ---------- | -------- |
| 4   | What is the capital city of Japan?                     | Seoul       | Beijing         | Tokyo            | Bangkok    | Option C |
| 9   | সূর্য থেকে পৃথিবীতে আলো আসতে কত সময় লাগে?                          | ৮ মিনিট       | ৮ মিনিট ২০ সেকেন্ড   | ৯ মিনিট            | ১০ মিনিট     | Option B |
| 2   | Who is known as the father of modern computer science? | Alan Turing | Charles Babbage | John von Neumann | Bill Gates | Option A |
| 11  | কম্পিউটারের মস্তিষ্ক বলা হয় কাকে?                                | হার্ডডিস্ক      | প্রসেসর           | মাদারবোর্ড           | র্যাম        | Option B |
| 7   | বায়ুমণ্ডলের কোন স্তরে ওজন স্তর অবস্থিত?                          | ট্রপোমণ্ডল     | স্ট্রাটোমণ্ডল        | মেসোমণ্ডল           | আয়নোমণ্ডল    | Option B |
| 1   | প্রথম জাতীয় বননীতি ঘোষিত হয় কত সালে?                            | ১৯৬৩ সালে     | ১৯৬৪ সালে         | ১৯৬৫ সালে          | ১৯৬৮ সালে    | Option C |
| 12  | What is the chemical symbol for Gold?                  | Ag          | Au              | Fe               | Cu         | Option B |
| 5   | গ্রিনহাউস গ্যাসের প্রধান উপাদান কোনটি?                             | নাইট্রোজেন      | অক্সিজেন           | কার্বন ডাই অক্সাইড    | মিথেন        | Option C |
| 10  | How many continents are there on Earth?                | 5           | 6               | 7                | 8          | Option C |
| 3   | বাংলাদেশের জাতীয় মাছ কোনটি?                                      | ইলিশ         | রুই              | কাতলা              | বোয়াল        | Option A |
| 8   | What is the square root of 144?                        | 10          | 11              | 12               | 13         | Option C |
| 6   | Which planet is known as the Red Planet?               | Earth       | Mars            | Jupiter          | Venus      | Option B |