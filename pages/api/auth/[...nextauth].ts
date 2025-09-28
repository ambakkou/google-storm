import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Allow only specific admin emails
      const adminEmails = [
        'bakkouamine@gmail.com',
        'Bhaveshbasdeo@gmail.com',
        'ragulkumar2611@gmail.com',
        'joshgopaul91@gmail.com',
         // Replace with your actual admin email
        // Add more admin emails as needed
      ]
      
      if (user.email && adminEmails.includes(user.email)) {
        return true
      }
      
      // Reject sign-in for non-admin users
      return false
    },
    async session({ session, token }) {
      // Add admin flag to session
      if (session.user?.email) {
        const adminEmails = [
            'bakkouamine@gmail.com',
            'Bhaveshbasdeo@gmail.com',
            'ragulkumar2611@gmail.com',
            'joshgopaul91@gmail.com', // Replace with your actual admin email
          // Add more admin emails as needed
        ]
        session.user.isAdmin = adminEmails.includes(session.user.email)
      }
      return session
    },
    async jwt({ token, user }) {
      return token
    }
  },
  pages: {
    signIn: '/admin/signin',
    error: '/admin/error',
  },
  session: {
    strategy: 'jwt',
  },
})

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      email?: string | null
      name?: string | null
      image?: string | null
      isAdmin?: boolean
    }
  }
}
