import { getSession, withPageAuthRequired } from "@auth0/nextjs-auth0";
import { faHashtag } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ObjectId } from "mongodb";
import { AppLayout } from "../../components/AppLayout/AppLayout";
import clientPromise from "../../lib/mongodb";

export default function Post(props) {
  console.log("PROPS :", props);
  return (
    <div className="overflow-auto h-full">
      <div>
        <div className="max-w-screen-md mx-auto">
          <div className="text-sm font-bold mt-6 p-2 bg-stone-200 rounded-sm">
            SEO title and meta description
          </div>
          <div className="p-4 my-2 border border-stone-200 rounded-md">
            <div className="text-blue-600 text-2xl font-bold">
              {props.title}
            </div>
            <div className="mt-2">{props.metaDescription}</div>
          </div>
          <div className="text-sm font-bold mt-6 p-2 bg-stone-200 rounded-sm">
            Keywords
          </div>
          <div className="flex flex-wrap pt-2 gap-1">
            {props.keywords.split(/,|、/).map((keyword, i) => (
              <div className="p-2 rounded-full bg-slate-800 text-white" key={i}>
                <FontAwesomeIcon icon={faHashtag} />
                {keyword}
              </div>
            ))}
          </div>
          <div className="text-sm font-bold mt-6 p-2 bg-stone-200 rounded-sm">
            Blog post
          </div>
          <div dangerouslySetInnerHTML={{ __html: props.postContent || "" }} />
        </div>
      </div>
    </div>
  );
}

// ページのレイアウトを決定するために使用される
Post.getLayout = (page, pageProps) => {
  return <AppLayout {...pageProps}>{page}</AppLayout>;
};

export const getServerSideProps = withPageAuthRequired({
  async getServerSideProps(ctx) {
    const userSession = await getSession(ctx.req, ctx.res);
    const client = await clientPromise;
    const db = client.db("BlogStandard");
    const user = await db.collection("users").findOne({
      auth0Id: userSession.user.sub,
    });
    const post = await db.collection("posts").findOne({
      _id: new ObjectId(ctx.params.postid),
      userId: user._id,
    });

    if (!post) {
      return {
        redirect: {
          destination: "/post/new",
          permanent: false,
        },
      };
    }

    return {
      props: {
        postContent: post.postContent,
        title: post.title,
        metaDescription: post.metaDescription,
        keywords: post.keywords,
      },
    };
  },
});
