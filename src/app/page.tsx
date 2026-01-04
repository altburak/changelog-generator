"use client"  // ← Bu satırı en üste ekle

import { signIn } from "next-auth/react"



export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-6">API Changelog Generator</h1>
        <p className="text-gray-600 mb-8">
          GitHub repo'larınızdan otomatik changelog oluşturun
        </p>
        <button
          onClick={() => signIn("github")}
          className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition"
        >
          GitHub ile Giriş Yap
        </button>
      </div>
    </main>
  )
}