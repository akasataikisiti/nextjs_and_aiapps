import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";
import { Configuration, OpenAIApi } from "openai";
import clientPromise from "../../lib/mongodb";

export default withApiAuthRequired(async function handler(req, res) {
  const { user } = await getSession(req, res);
  const client = await clientPromise;
  const db = client.db("BlogStandard");
  const userProfile = await db.collection("users").findOne({
    auth0Id: user.sub,
  });

  if (!userProfile?.availableTokens) {
    res.status(403);
    return;
  }

  const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(config);

  const { topic, keywords } = req.body;

  if (!topic || !keywords) {
    res.status(422);
    return;
  }

  if (topic.length > 80 || keywords.length > 80) {
    res.status(422);
    return;
  }

  ("first--time dog owners, common dog health issues, best dog breeds");

  // openaiで記事を作成する
  const response = await openai.createCompletion({
    model: "text-davinci-003",
    temperature: 0,
    max_tokens: 3600,
    // prompt: `${topic}について、コンマで区切られた次のキーワード${keywords}を対象とした長くて詳細でかつSEO フレンドリーな記事を書いて,
    // コンテンツは SEO に適した HTML でフォーマットされている必要があります。
    // 応答には、適切な HTML タイトルとメタ説明コンテンツも含める必要があります。
    // 返される形式は、次の形式の文字列化された JSON である必要があります。
    // {
    //   "postContent": ここにコンテンツを投稿します
    //   "title": ここにタイトルが入ります
    //   "metaDescription": ここにメタ説明が入ります
    // }
    // `,
    prompt: `Write a long and detailed SEO-friendly blog post about ${topic}, that targets the following comma-separated keyvowrds: ${keywords}.
        The content should be formatted in SEO-friendly HTML.
        Output the content and title of the article in Japanese.
        The response must also include appropriate HTML title and meta description content.
        The return format must be stringified JSON in the following format:
        {
          "postContent": post content here
          "title": title goes here
          "metaDescription": meta description goes here
        }
    `,
  });

  console.log("response: ", response.data.choices);

  // ユーザのトークンを減らす
  await db.collection("users").updateOne(
    {
      auth0Id: user.sub,
    },
    {
      $inc: {
        availableTokens: -1,
      },
    }
  );

  // 返却値をJSON文字列の形にしてからパースする
  const parsed = JSON.parse(
    response.data.choices[0]?.text.split("\n").join("")
  );

  const post = await db.collection("posts").insertOne({
    postContent: parsed?.postContent,
    title: parsed?.title,
    metaDescription: parsed?.metaDescription,
    topic,
    keywords,
    userId: userProfile._id,
    created: new Date(),
  });
  console.log("post: ", post);

  res.status(200).json({
    postId: post.insertedId,
  });
});
