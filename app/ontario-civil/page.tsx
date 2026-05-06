export default function OntarioCivilPage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-12">

      {/* HEADER */}
      <h1 className="text-3xl font-bold mb-4">
        Ontario Civil Court (Superior Court)
      </h1>

      <p className="text-gray-600 mb-6">
        This section is for larger or more complex legal disputes that go beyond Small Claims Court.
        It helps you understand the civil court process, what documents are involved, and how to prepare properly.
      </p>

      {/* QUICK INFO */}
      <div className="bg-green-50 border rounded-lg p-4 mb-8">
        <p><strong>Court:</strong> Superior Court of Justice</p>
        <p><strong>Main forms:</strong> Form 14A (Claim), Form 18A (Defence)</p>
        <p><strong>Filing fee:</strong> About $220 (can change)</p>
      </div>

      {/* EXPLANATION */}
      <h2 className="text-xl font-semibold mb-4">What this court is for</h2>

      <p className="text-gray-600 mb-8">
        Civil court is used for higher-value or more complex legal issues such as contract disputes,
        negligence claims, property issues, or situations that require stronger legal structure.
      </p>

      {/* PROCESS */}
      <h2 className="text-xl font-semibold mb-4">How the process works</h2>

      <div className="space-y-4 mb-10">

        <div className="border p-4 rounded-lg">
          <strong>1. Prepare your claim</strong>
          <p className="text-gray-600">
            Identify the correct parties and clearly explain what happened and what you are asking for.
          </p>
        </div>

        <div className="border p-4 rounded-lg">
          <strong>2. File your claim</strong>
          <p className="text-gray-600">
            Submit your Statement of Claim to the court (often Form 14A).
          </p>
        </div>

        <div className="border p-4 rounded-lg">
          <strong>3. Serve the defendant</strong>
          <p className="text-gray-600">
            Properly deliver the claim and keep proof of service.
          </p>
        </div>

        <div className="border p-4 rounded-lg">
          <strong>4. Defence or response</strong>
          <p className="text-gray-600">
            The other side can respond (usually within 20 days).
          </p>
        </div>

        <div className="border p-4 rounded-lg">
          <strong>5. Civil process begins</strong>
          <p className="text-gray-600">
            This can include motions, discovery, mediation, or case management.
          </p>
        </div>

        <div className="border p-4 rounded-lg">
          <strong>6. Settlement or trial</strong>
          <p className="text-gray-600">
            Many cases settle. Others proceed to trial.
          </p>
        </div>

      </div>

      {/* SIMPLIFIED PROCEDURE */}
      <div className="bg-yellow-50 border p-4 rounded-lg mb-10">
        <h3 className="font-semibold mb-2">Simplified Procedure</h3>
        <p className="text-gray-600">
          Some civil cases follow a simplified process that reduces cost and complexity.
          Your case may fall into this category depending on the situation.
        </p>
      </div>

      {/* WHAT TO PREPARE */}
      <h2 className="text-xl font-semibold mb-4">What you should prepare</h2>

      <ul className="list-disc pl-6 text-gray-600 mb-10">
        <li>Full legal names of all parties</li>
        <li>A clear timeline of events</li>
        <li>Contracts, emails, letters, and documents</li>
        <li>What you are asking the court to order</li>
        <li>Any deadlines or urgency</li>
      </ul>

      {/* NEXT STEP */}
      <div className="bg-gray-100 p-6 rounded-lg text-center">
        <h3 className="font-semibold mb-2">Next Step</h3>
        <p className="text-gray-600 mb-4">
          Start organizing your case so the system can guide you through forms and documents.
        </p>

        <a
          href="/start"
          className="bg-green-600 text-white px-6 py-2 rounded-lg inline-block"
        >
          Start Your Case
        </a>
      </div>

    </main>
  );
}