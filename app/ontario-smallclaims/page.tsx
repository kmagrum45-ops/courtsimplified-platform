export default function OntarioSmallClaimsPage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-12">

      {/* HEADER */}
      <h1 className="text-3xl font-bold mb-4">
        Ontario Small Claims Court
      </h1>

      <p className="text-gray-600 mb-6">
        This section helps you understand how Small Claims Court works in Ontario,
        what steps are involved, and what you need to prepare before filing or responding.
      </p>

      {/* QUICK INFO */}
      <div className="bg-green-50 border rounded-lg p-4 mb-8">
        <p><strong>Claim limit:</strong> Up to $50,000</p>
        <p><strong>Main forms:</strong> Form 7A (Claim), Form 9A (Defence)</p>
        <p><strong>Response time:</strong> Usually 20 days</p>
      </div>

      {/* HOW IT WORKS */}
      <h2 className="text-xl font-semibold mb-4">How the process works</h2>

      <div className="space-y-4 mb-10">
        <div className="border p-4 rounded-lg">
          <strong>1. Prepare your claim</strong>
          <p className="text-gray-600">
            Write what happened, who is involved, and what you are asking for.
          </p>
        </div>

        <div className="border p-4 rounded-lg">
          <strong>2. File your claim</strong>
          <p className="text-gray-600">
            Submit your claim online or at the courthouse.
          </p>
        </div>

        <div className="border p-4 rounded-lg">
          <strong>3. Serve the defendant</strong>
          <p className="text-gray-600">
            Deliver the claim properly and keep proof of service.
          </p>
        </div>

        <div className="border p-4 rounded-lg">
          <strong>4. Defence (if filed)</strong>
          <p className="text-gray-600">
            The other side may respond and dispute your claim.
          </p>
        </div>

        <div className="border p-4 rounded-lg">
          <strong>5. Settlement conference</strong>
          <p className="text-gray-600">
            A judge helps both sides try to resolve the case early.
          </p>
        </div>

        <div className="border p-4 rounded-lg">
          <strong>6. Trial or default</strong>
          <p className="text-gray-600">
            If unresolved, it goes to trial — or default if no defence is filed.
          </p>
        </div>
      </div>

      {/* WHAT TO PREPARE */}
      <h2 className="text-xl font-semibold mb-4">What you should prepare</h2>

      <ul className="list-disc pl-6 text-gray-600 mb-10">
        <li>Names and addresses of all parties</li>
        <li>Timeline of events</li>
        <li>Invoices, receipts, messages, contracts</li>
        <li>Amount you are claiming</li>
        <li>Any previous communication or demand</li>
      </ul>

      {/* NEXT STEP */}
      <div className="bg-gray-100 p-6 rounded-lg text-center">
        <h3 className="font-semibold mb-2">Next Step</h3>
        <p className="text-gray-600 mb-4">
          Once you understand your situation, start building your case summary.
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