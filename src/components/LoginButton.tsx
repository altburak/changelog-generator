'use client';

import { signIn } from "next-auth/react";

export default function LoginButton() {
  return (
    <button
      onClick={() => signIn("github")}
      className="bg-black text-white px-8 py-4 rounded-xl"
    >
      Login with GitHub
    </button>
  );
}
