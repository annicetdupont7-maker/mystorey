import { redirect } from "next/navigation";

// Identity used to live here and at /identity with two different editors that saved
// different subsets of the same row. One canonical page now owns it.
export default function StorefrontPage() {
  redirect("/dashboard/storefront/identity");
}
