import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/events/:path*",
    "/inspiration/:path*",
    "/decorations/:path*",
    "/resources/:path*",
    "/ai-planner/:path*",
    "/chat/:path*",
    "/collaboration/:path*",
    "/analytics/:path*",
    "/settings/:path*",
  ],
};
