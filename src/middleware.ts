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
    "/collaboration/:path*",
    "/mixer/:path*",
    "/wrapped/:path*",
    "/analytics/:path*",
    "/settings/:path*",
  ],
};
