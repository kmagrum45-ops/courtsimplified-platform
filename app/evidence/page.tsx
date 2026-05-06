"use client";

import { useEffect, useState } from "react";

type ParsedMessage = {
  date: string;
  time: string;
  sender: string;
  message: string;
};

type ExhibitGroup = {
  id: number;
  label: string; // A1, A2...
  messages: ParsedMessage[];
  title: string;
  description: string;
  relevance: string;
  confirmed: boolean;
};

export default function EvidencePage() {
  const [parsedMessages, setParsedMessages] = useState<ParsedMessage[]>([]);
  const [groups, setGroups] = useState<ExhibitGroup[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [groupCount, setGroupCount] = useState(1);

  useEffect(() => {
    const raw = localStorage.getItem("courtsimplified_parsed_messages");
    if (raw) {
      setParsedMessages(JSON.parse(raw));
    }
  }, []);

  function toggleSelect(index: number) {
    setSelectedIndexes((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  }

  function createGroup() {
    if (selectedIndexes.length === 0) return;

    const selectedMessages = selectedIndexes.map((i) => parsedMessages[i]);

    const newGroup: ExhibitGroup = {
      id: groupCount,
      label: `A${groupCount}`,
      messages: selectedMessages,
      title: "",
      description: "",
      relevance: "",
      confirmed: false,
    };

    setGroups([...groups, newGroup]);
    setGroupCount(groupCount + 1);
    setSelectedIndexes([]);
  }

  function updateGroup(id: number, field: keyof ExhibitGroup, value: any) {
    setGroups(
      groups.map((g) =>
        g.id === id ? { ...g, [field]: value } : g
      )
    );
  }

  function confirmGroup(id: number) {
    setGroups(
      groups.map((g) =>
        g.id === id ? { ...g, confirmed: true } : g
      )
    );
  }

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-6">Evidence Builder</h1>

      {/* STEP 1: MESSAGE SELECTION */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">
          Step 1: Select messages/screenshots
        </h2>

        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {parsedMessages.map((msg, index) => (
            <div
              key={index}
              onClick={() => toggleSelect(index)}
              className={`p-3 border rounded cursor-pointer ${
                selectedIndexes.includes(index)
                  ? "bg-blue-100"
                  : "bg-white"
              }`}
            >
              <p className="text-sm font-semibold">
                {msg.date} {msg.time} — {msg.sender}
              </p>
              <p className="text-sm">{msg.message}</p>
            </div>
          ))}
        </div>

        <button
          onClick={createGroup}
          className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
        >
          Group Selected into Exhibit
        </button>
      </section>

      {/* STEP 2: EXHIBIT BUILDER */}
      <section>
        <h2 className="text-xl font-semibold mb-3">
          Step 2: Build Exhibits (A1, A2…)
        </h2>

        {groups.map((group) => (
          <div key={group.id} className="border p-4 mb-6 rounded">
            <h3 className="font-bold mb-2">
              Exhibit {group.label}
            </h3>

            <div className="mb-3 text-sm">
              {group.messages.map((m, i) => (
                <p key={i}>
                  {m.date} {m.time} — {m.sender}: {m.message}
                </p>
              ))}
            </div>

            <input
              placeholder="Title (Required)"
              value={group.title}
              onChange={(e) =>
                updateGroup(group.id, "title", e.target.value)
              }
              className="w-full border p-2 mb-2"
            />

            <textarea
              placeholder="What is this evidence? (Required)"
              value={group.description}
              onChange={(e) =>
                updateGroup(group.id, "description", e.target.value)
              }
              className="w-full border p-2 mb-2"
            />

            <textarea
              placeholder="Why does it matter? (Required)"
              value={group.relevance}
              onChange={(e) =>
                updateGroup(group.id, "relevance", e.target.value)
              }
              className="w-full border p-2 mb-2"
            />

            <button
              onClick={() => confirmGroup(group.id)}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Confirm Exhibit
            </button>

            {group.confirmed && (
              <p className="text-green-600 font-semibold mt-2">
                Confirmed ✔
              </p>
            )}
          </div>
        ))}
      </section>

      {/* STEP 3: PREVIEW */}
      {groups.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-3">
            Step 3: Exhibit Preview (Court Ready)
          </h2>

          {groups.map((g) => (
            <div key={g.id} className="mb-6 border p-4 rounded">
              <h3 className="font-bold">
                Exhibit {g.label}: {g.title}
              </h3>
              <p className="text-sm mt-2">{g.description}</p>
              <p className="text-sm mt-2 italic">
                {g.relevance}
              </p>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}