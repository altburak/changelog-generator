"use client"

import { useSession, signOut } from "next-auth/react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Yükleniyor...</p>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <main className="flex min-h-screen flex-col p-8">
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Hoş geldin, {session.user?.name}!
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Çıkış Yap
          </button>
        </div>
        
        <div className="bg-gray-100 p-6 rounded-lg">
          <p className="text-gray-700">
            GitHub OAuth başarıyla çalışıyor! 🎉
          </p>
        </div>
      </div>
    </main>
  )
}